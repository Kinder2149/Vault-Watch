// Disponibilité des titres suivis : relevé des offres de streaming (et de la saga), rangé dans le
// suivi, renouvelé au bout de 7 jours, jamais au détriment du suivi lui-même.
// Le catalogue TMDB est remplacé par un catalogue de test : on vérifie les règles de l'application.
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../src/tmdb.js', () => ({
  getSeriesStructure: vi.fn(),
  getEpisodes: vi.fn(),
  getRecommendations: vi.fn(),
  getCardInfo: vi.fn(),
  getRuntime: vi.fn(),
  getNotifInfo: vi.fn(),
}));

const JOUR = new Date('2026-10-27T10:00:00Z');
const NETFLIX = { n: 'Netflix', l: '/netflix.jpg' };
const APPLE = { n: 'Apple TV', l: '/apple.jpg' };
const RELEVE = { offres: { a: [NETFLIX], l: [APPLE] }, saga: null, releaseDate: null };

let store, db, tmdb, profil;

const film = (id, extra = {}) => ({ id, mediaType: 'movie', title: `Film ${id}`, year: '2024', ...extra });
const ajouter = (id, statut = 'a_voir', extra = {}) =>
  store.addToSuivi(profil.id, film(id, extra)).then(() => store.setStatus(profil.id, 'movie', id, statut));
const ligne = async (id) => (await store.listSuivi(profil.id)).find((l) => l.id === id);
const relever = (options = {}) =>
  store.backfillDisponibilite(profil.id, { maintenant: JOUR, region: 'FR', ...options });

beforeEach(async () => {
  vi.resetModules();
  localStorage.clear();
  db = await import('../src/db.js');
  store = await import('../src/store.js');
  tmdb = await import('../src/tmdb.js');
  vi.clearAllMocks();
  tmdb.getCardInfo.mockResolvedValue(RELEVE);
  await db.initDb();
  [profil] = await store.listProfiles();
});

describe('lecture du suivi', () => {
  it('un titre jamais relevé a des offres inconnues (null), pas « aucune offre »', async () => {
    await ajouter(1);
    const l = await ligne(1);
    expect(l.providers).toBeNull();
    expect(l).not.toHaveProperty('offres');
  });

  it('une région sans aucune offre est un relevé fait : listes vides, pas null', async () => {
    tmdb.getCardInfo.mockResolvedValue({ offres: { a: [], l: [] }, saga: null, releaseDate: null });
    await ajouter(1);
    await relever();
    expect((await ligne(1)).providers).toEqual({ flatrate: [], rent: [], buy: [] });
  });
});

describe('relevé', () => {
  it('range les offres, la saga et rend les logos complets', async () => {
    tmdb.getCardInfo.mockResolvedValue({
      offres: { a: [NETFLIX], l: [APPLE] },
      saga: { id: 10, nom: 'Saga Dune' },
      releaseDate: '2024-03-01',
    });
    await ajouter(1);
    expect(await relever()).toBe(1);

    const l = await ligne(1);
    expect(l.providers.flatrate).toEqual([{ name: 'Netflix', logoUrl: 'https://image.tmdb.org/t/p/w45/netflix.jpg' }]);
    expect(l.providers.rent.map((p) => p.name)).toEqual(['Apple TV']);
    expect(l).toMatchObject({ sagaId: 10, sagaNom: 'Saga Dune', releaseDate: '2024-03-01' });
  });

  it('demande les offres de la région du catalogue', async () => {
    await ajouter(1);
    await relever({ region: 'US' });
    expect(tmdb.getCardInfo).toHaveBeenCalledWith('movie', 1, 'fr-FR', 'US');
  });

  it('un titre déjà relevé aujourd’hui n’est pas redemandé', async () => {
    await ajouter(1);
    await relever();
    tmdb.getCardInfo.mockClear();
    expect(await relever()).toBe(0);
    expect(tmdb.getCardInfo).not.toHaveBeenCalled();
  });

  it('un relevé de moins de 7 jours n’est pas redemandé, de 7 jours ou plus il l’est', async () => {
    await ajouter(1);
    await relever();
    tmdb.getCardInfo.mockClear();

    const sixJours = new Date(JOUR.getTime() + 6 * 86400000);
    expect(await relever({ maintenant: sixJours })).toBe(0);

    const septJours = new Date(JOUR.getTime() + 7 * 86400000);
    expect(await relever({ maintenant: septJours })).toBe(1);
    expect(tmdb.getCardInfo).toHaveBeenCalledTimes(1);
  });

  it('un relevé fait pour une autre région est redemandé', async () => {
    await ajouter(1);
    await relever({ region: 'FR' });
    tmdb.getCardInfo.mockClear();
    expect(await relever({ region: 'US' })).toBe(1);
  });

  it('un échec réseau ne marque rien : le titre est retenté au prochain relevé', async () => {
    await ajouter(1);
    tmdb.getCardInfo.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    expect(await relever()).toBe(0);
    expect((await ligne(1)).providers).toBeNull();

    expect(await relever()).toBe(1);
    expect((await ligne(1)).providers).not.toBeNull();
  });

  it('un titre en échec n’empêche pas les autres', async () => {
    await ajouter(1);
    await ajouter(2);
    tmdb.getCardInfo.mockImplementation(async (_type, id) => {
      if (id === 1) throw new TypeError('Failed to fetch');
      return RELEVE;
    });
    expect(await relever()).toBe(1);
    expect((await ligne(1)).providers).toBeNull();
    expect((await ligne(2)).providers).not.toBeNull();
  });

  it('seuls les titres à voir et en cours sont relevés', async () => {
    await ajouter(1, 'a_voir');
    await ajouter(2, 'en_cours');
    await ajouter(3, 'vu');
    await ajouter(4, 'abandonne');
    expect(await relever()).toBe(2);
    expect((await ligne(3)).providers).toBeNull();
    expect((await ligne(4)).providers).toBeNull();
  });

  it('plafonné à 60 titres par appel ; le reste attend l’appel suivant', async () => {
    for (let id = 1; id <= 65; id += 1) await ajouter(id);
    expect(await relever()).toBe(60);
    expect(await relever()).toBe(5);
    expect(await relever()).toBe(0);
  });

  it('les titres jamais relevés passent avant les plus anciens relevés', async () => {
    await ajouter(1);
    await relever({ maintenant: new Date('2026-10-01T10:00:00Z') }); // relevé de 26 jours
    await ajouter(2); // jamais relevé
    tmdb.getCardInfo.mockClear();

    await relever({ maximum: 1 });
    expect(tmdb.getCardInfo).toHaveBeenCalledWith('movie', 2, 'fr-FR', 'FR');
  });

  it('un ajout est relevé au relevé suivant, sans toucher aux autres', async () => {
    await ajouter(1);
    await relever();
    tmdb.getCardInfo.mockClear();

    await ajouter(2);
    expect(await relever()).toBe(1);
    expect(tmdb.getCardInfo).toHaveBeenCalledTimes(1);
    expect(tmdb.getCardInfo).toHaveBeenCalledWith('movie', 2, 'fr-FR', 'FR');
  });

  it('la date de sortie de la région complète la date, sans effacer une date connue', async () => {
    await ajouter(1, 'a_voir', { releaseDate: '2024-03-01' });
    tmdb.getCardInfo.mockResolvedValue({ ...RELEVE, releaseDate: null });
    await relever();
    expect((await ligne(1)).releaseDate).toBe('2024-03-01');
  });

  it('ne relève que le profil demandé', async () => {
    const autre = await store.createProfile('Autre');
    await ajouter(1);
    await store.addToSuivi(autre.id, film(1));
    await relever();
    const chezAutre = (await store.listSuivi(autre.id)).find((l) => l.id === 1);
    expect(chezAutre.providers).toBeNull();
  });
});

describe('sauvegarde', () => {
  it('les offres ne sont pas dans la sauvegarde : une restauration les refait', async () => {
    await ajouter(1);
    await relever();
    const { exportProfile } = await import('../src/backup.js');
    const sauvegarde = JSON.stringify(await exportProfile(profil.id));
    expect(sauvegarde).not.toContain('Netflix');
    expect(sauvegarde).not.toContain('offres');
  });
});
