// Envoi différé : une modification programme son propre envoi, regroupé et espacé.
// Même principe que `cloud.auto.test.js` : seule l'autorisation Google est remplacée.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../src/tmdb.js', () => ({
  getSeasons: vi.fn().mockResolvedValue([]),
  getSeriesStructure: vi.fn().mockResolvedValue({ seasons: [], lastAired: null }),
  getEpisodes: vi.fn().mockResolvedValue([]),
  getRecommendations: vi.fn().mockResolvedValue([]),
  getCardInfo: vi.fn(),
  getRuntime: vi.fn(),
}));

const autorisation = vi.fn();
vi.mock('../src/google.js', async (importOriginal) => {
  const vrai = await importOriginal();
  return { ...vrai, getAccessToken: (...args) => autorisation(...args) };
});

const COMPTE = { userId: '1', email: 'kinder@example.com', displayName: 'Kinder' };
const SEC = 1000;

let backup, envois;

beforeEach(async () => {
  vi.resetModules();
  localStorage.clear();
  autorisation.mockReset();
  autorisation.mockResolvedValue('jeton-valide');
  envois = [];

  globalThis.fetch = vi.fn(async (url) => {
    if (String(url).includes('/upload/drive/v3/files')) {
      envois.push(String(url));
      return { ok: true, status: 200, json: async () => ({ id: `id-${envois.length}` }) };
    }
    return { ok: true, status: 200, json: async () => ({ files: [] }) };
  });

  const db = await import('../src/db.js');
  backup = await import('../src/backup.js');
  await db.initDb();
  localStorage.setItem('google-account', JSON.stringify(COMPTE));

  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  backup.reglerDelaisEnvoi({}); // valeurs par défaut : 30 s / 2 min / 60 s
});

afterEach(() => {
  vi.useRealTimers();
  delete globalThis.fetch;
});

const attendre = (ms) => vi.advanceTimersByTimeAsync(ms);

describe('envoi différé', () => {
  it('une modification part toute seule après 30 s de calme', async () => {
    backup.markChanged();
    await attendre(29 * SEC);
    expect(envois).toHaveLength(0);
    await attendre(2 * SEC);
    expect(envois).toHaveLength(1);
    expect(backup.hasPendingChanges()).toBe(false);
  });

  it('trois modifications en 10 s donnent un seul envoi', async () => {
    backup.markChanged();
    await attendre(5 * SEC);
    backup.markChanged();
    await attendre(5 * SEC);
    backup.markChanged();
    await attendre(31 * SEC);
    expect(envois).toHaveLength(1);
  });

  it('sous un usage continu, l’envoi part au plus tard 2 min après la première modification', async () => {
    backup.markChanged();
    // Une modification toutes les 20 s : le calme de 30 s n'arrive jamais.
    for (let i = 0; i < 5; i += 1) {
      await attendre(20 * SEC);
      backup.markChanged();
    }
    await attendre(25 * SEC); // 125 s depuis la première
    expect(envois.length).toBeGreaterThanOrEqual(1);
  });

  it('deux tentatives automatiques ne sont jamais à moins de 60 s', async () => {
    backup.markChanged();
    await attendre(31 * SEC); // premier envoi
    expect(envois).toHaveLength(1);

    backup.markChanged(); // calme de 30 s, mais écart de 60 s depuis la dernière tentative
    await attendre(31 * SEC);
    expect(envois).toHaveLength(1);
    await attendre(30 * SEC);
    expect(envois).toHaveLength(2);
  });

  it('une modification pendant l’envoi est envoyée ensuite', async () => {
    backup.markChanged();
    await attendre(31 * SEC);
    expect(envois).toHaveLength(1);
    backup.markChanged();
    await attendre(91 * SEC);
    expect(envois).toHaveLength(2);
    expect(backup.hasPendingChanges()).toBe(false);
  });

  it('ne programme rien sans compte relié', async () => {
    localStorage.removeItem('google-account');
    backup.markChanged();
    await attendre(5 * 60 * SEC);
    expect(envois).toHaveLength(0);
    expect(autorisation).not.toHaveBeenCalled();
  });

  it('ne programme rien quand la sauvegarde automatique est coupée', async () => {
    backup.reglerSauvegardeAuto(false);
    backup.markChanged();
    await attendre(5 * 60 * SEC);
    expect(envois).toHaveLength(0);
  });

  it('couper l’interrupteur annule l’envoi déjà programmé', async () => {
    backup.markChanged();
    await attendre(10 * SEC);
    backup.reglerSauvegardeAuto(false);
    await attendre(60 * SEC);
    expect(envois).toHaveLength(0);
  });

  it('rallumer l’interrupteur reprogramme ce qui attend', async () => {
    backup.reglerSauvegardeAuto(false);
    backup.markChanged();
    backup.reglerSauvegardeAuto(true);
    await attendre(31 * SEC);
    expect(envois).toHaveLength(1);
  });

  it('ne se reprogramme pas après un conflit', async () => {
    // Un fichier du Drive plus récent que ce que l'appareil connaît : conflit.
    globalThis.fetch = vi.fn(async (url) => {
      if (String(url).includes('/upload/drive/v3/files')) {
        envois.push(String(url));
        return { ok: true, status: 200, json: async () => ({ id: 'x' }) };
      }
      const db = await import('../src/db.js');
      const [profil] = await db.query('SELECT id FROM profiles');
      return {
        ok: true,
        status: 200,
        json: async () => ({
          files: [{ id: 'f1', name: `profil-${profil.id}.json`, modifiedTime: '2026-10-26T10:00:00.000Z' }],
        }),
      };
    });
    backup.markChanged();
    await attendre(31 * SEC);
    expect(backup.dernierEssaiAutomatique()).toMatchObject({ fait: false, raison: 'conflit' });

    const tentatives = autorisation.mock.calls.length;
    backup.markChanged(); // l'utilisateur continue de cocher : rien ne doit repartir
    await attendre(5 * 60 * SEC);
    expect(autorisation.mock.calls.length).toBe(tentatives);
    expect(envois).toHaveLength(0);
  });

  it('un échec ne déclenche pas de nouvel essai tout seul', async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: false, status: 503, text: async () => 'Drive indisponible' }));
    backup.markChanged();
    await attendre(31 * SEC);
    const tentatives = autorisation.mock.calls.length;
    expect(tentatives).toBe(1);
    await attendre(10 * 60 * SEC);
    expect(autorisation.mock.calls.length).toBe(tentatives);
    expect(backup.hasPendingChanges()).toBe(true);
  });
});
