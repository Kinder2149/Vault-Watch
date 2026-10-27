// Reprise au retour du réseau : un envoi raté faute de connexion repart tout seul, une fois.
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

let backup, envois, reseauCoupe;

beforeEach(async () => {
  vi.resetModules();
  localStorage.clear();
  autorisation.mockReset();
  autorisation.mockResolvedValue('jeton-valide');
  envois = [];
  reseauCoupe = false;

  globalThis.fetch = vi.fn(async (url) => {
    if (reseauCoupe) throw new TypeError('Failed to fetch');
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
  backup.reglerDelaisEnvoi({});
});

afterEach(() => {
  vi.useRealTimers();
  delete globalThis.fetch;
});

const attendre = (ms) => vi.advanceTimersByTimeAsync(ms);

// Une modification, un envoi qui échoue faute de réseau, puis on rend le réseau.
async function echecReseau() {
  reseauCoupe = true;
  backup.markChanged();
  await attendre(31 * SEC);
  expect(backup.dernierEssaiAutomatique()).toMatchObject({ fait: false, raison: 'hors-ligne' });
  reseauCoupe = false;
}

describe('reprise au retour du réseau', () => {
  it('relance l’envoi 3 s après le retour de la connexion, sans attendre l’écart de 60 s', async () => {
    await echecReseau(); // dernier essai à t = 30 s, il y a ~1 s
    backup.reprendreApresReseau();
    await attendre(2 * SEC);
    expect(envois).toHaveLength(0);
    await attendre(2 * SEC);
    expect(envois).toHaveLength(1);
    expect(backup.hasPendingChanges()).toBe(false);
  });

  it('deux retours rapprochés (connexion qui sautille) : un seul envoi', async () => {
    await echecReseau();
    backup.reprendreApresReseau();
    await attendre(SEC);
    backup.reprendreApresReseau();
    await attendre(10 * SEC);
    expect(envois).toHaveLength(1);
  });

  it('l’évènement « online » de la fenêtre déclenche la reprise, et l’écoute se retire', async () => {
    // L'environnement de test n'a pas de fenêtre : un simple porteur d'évènements suffit.
    const fenetre = new EventTarget();
    globalThis.window = fenetre;
    try {
      const arreter = backup.demarrerEcouteReseau();
      await echecReseau();
      fenetre.dispatchEvent(new Event('online'));
      await attendre(4 * SEC);
      expect(envois).toHaveLength(1);

      arreter();
      reseauCoupe = true;
      backup.markChanged();
      await attendre(31 * SEC);
      reseauCoupe = false;
      fenetre.dispatchEvent(new Event('online'));
      await attendre(10 * SEC);
      expect(envois).toHaveLength(1); // plus d'écoute : rien ne repart
    } finally {
      delete globalThis.window;
    }
  });

  it('ne fait rien quand rien n’attend', async () => {
    backup.reprendreApresReseau();
    await attendre(10 * SEC);
    expect(autorisation).not.toHaveBeenCalled();
    expect(envois).toHaveLength(0);
  });

  it('ne fait rien quand la sauvegarde automatique est coupée', async () => {
    await echecReseau();
    backup.reglerSauvegardeAuto(false);
    backup.reprendreApresReseau();
    await attendre(10 * SEC);
    expect(envois).toHaveLength(0);
  });

  it('ne fait rien sans compte relié', async () => {
    await echecReseau();
    localStorage.removeItem('google-account');
    backup.reprendreApresReseau();
    await attendre(10 * SEC);
    expect(envois).toHaveLength(0);
  });

  it('ne relance pas après un refus d’autorisation : rien n’aurait changé', async () => {
    autorisation.mockResolvedValue(null);
    backup.markChanged();
    await attendre(31 * SEC);
    expect(backup.dernierEssaiAutomatique()).toMatchObject({ raison: 'autorisation-indisponible' });
    const essais = autorisation.mock.calls.length;
    backup.reprendreApresReseau();
    await attendre(10 * SEC);
    expect(autorisation.mock.calls.length).toBe(essais);
  });

  it('un échec qui n’est pas le réseau suit les règles ordinaires (pas de reprise immédiate)', async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: false, status: 503, text: async () => 'Drive indisponible' }));
    backup.markChanged();
    await attendre(31 * SEC);
    expect(backup.dernierEssaiAutomatique()).toMatchObject({ raison: 'echec' });
    const essais = autorisation.mock.calls.length;
    backup.reprendreApresReseau(); // programme selon calme + écart : pas avant ~60 s après l'essai
    await attendre(10 * SEC);
    expect(autorisation.mock.calls.length).toBe(essais);
  });
});
