// Films à l'affiche : une liste par région, relue une fois par jour, jamais « vide » par défaut.
// Le réseau est simulé : on vérifie ce que l'application demande à TMDB et ce qu'elle mémorise.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getFilmsEnSalle } from '../src/tmdb.js';
import { setCatalogLanguage } from '../src/lang.js';

const appels = [];

// `pages` : { 1: [ids], 2: [ids], … } ; `echec` : fait échouer l'appel de cette page.
function fauxTmdb({ pages, echec = null }) {
  vi.stubEnv('VITE_TMDB_API_KEY', 'cle-de-test');
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url) => {
      const u = new URL(url);
      const page = Number(u.searchParams.get('page') || 1);
      appels.push({ chemin: u.pathname.replace('/3', ''), region: u.searchParams.get('region'), page });
      if (echec === page) throw new TypeError('Failed to fetch');
      return {
        ok: true,
        status: 200,
        json: async () => ({
          total_pages: Object.keys(pages).length,
          results: (pages[page] || []).map((id) => ({ id })),
        }),
      };
    })
  );
}

beforeEach(() => {
  appels.length = 0;
  localStorage.clear();
  setCatalogLanguage('fr');
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

// Clés « en salle » actuellement rangées dans le stockage local.
const cles = () =>
  Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)).filter((k) => k.startsWith('en-salle:'));

const JOUR_1 = new Date('2026-10-27T10:00:00Z');
const JOUR_2 = new Date('2026-10-28T10:00:00Z');

describe('getFilmsEnSalle', () => {
  it('rassemble toutes les pages en une seule liste d’identifiants', async () => {
    fauxTmdb({ pages: { 1: [1, 2], 2: [3], 3: [4, 5] } });
    const ids = await getFilmsEnSalle(JOUR_1);
    expect([...ids].sort()).toEqual([1, 2, 3, 4, 5]);
    expect(appels.map((a) => a.page).sort()).toEqual([1, 2, 3]);
    expect(appels.every((a) => a.chemin === '/movie/now_playing')).toBe(true);
  });

  it('interroge la région du catalogue : France en français, États-Unis en anglais', async () => {
    fauxTmdb({ pages: { 1: [1] } });
    await getFilmsEnSalle(JOUR_1);
    expect(appels[0].region).toBe('FR');

    localStorage.clear();
    appels.length = 0;
    setCatalogLanguage('en');
    await getFilmsEnSalle(JOUR_1);
    expect(appels[0].region).toBe('US');
  });

  it('ne lit pas plus de dix pages', async () => {
    const pages = {};
    for (let p = 1; p <= 14; p += 1) pages[p] = [p];
    fauxTmdb({ pages });
    const ids = await getFilmsEnSalle(JOUR_1);
    expect(ids.size).toBe(10);
    expect(Math.max(...appels.map((a) => a.page))).toBe(10);
  });

  it('une seule lecture par jour : le second appel ne touche pas au réseau', async () => {
    fauxTmdb({ pages: { 1: [1, 2], 2: [3] } });
    await getFilmsEnSalle(JOUR_1);
    const apres = appels.length;
    const ids = await getFilmsEnSalle(JOUR_1);
    expect([...ids].sort()).toEqual([1, 2, 3]);
    expect(appels.length).toBe(apres);
  });

  it('deux appels simultanés ne doublent pas les requêtes', async () => {
    fauxTmdb({ pages: { 1: [1], 2: [2] } });
    const [a, b] = await Promise.all([getFilmsEnSalle(JOUR_1), getFilmsEnSalle(JOUR_1)]);
    expect(a.size).toBe(2);
    expect(b.size).toBe(2);
    expect(appels).toHaveLength(2);
  });

  it('le lendemain, relit la liste et oublie celle de la veille', async () => {
    fauxTmdb({ pages: { 1: [1] } });
    await getFilmsEnSalle(JOUR_1);
    const apres = appels.length;
    await getFilmsEnSalle(JOUR_2);
    expect(appels.length).toBe(apres + 1);
    expect(cles()).toEqual(['en-salle:FR:2026-10-28']);
  });

  it('un échec renvoie « inconnu » (null), pas une liste vide, et n’est pas mémorisé', async () => {
    fauxTmdb({ pages: { 1: [1], 2: [2] }, echec: 2 });
    expect(await getFilmsEnSalle(JOUR_1)).toBeNull();
    expect(cles()).toEqual([]);

    // Le réseau revient : le prochain appel réessaie et réussit.
    vi.unstubAllGlobals();
    fauxTmdb({ pages: { 1: [1], 2: [2] } });
    const ids = await getFilmsEnSalle(JOUR_1);
    expect([...ids].sort()).toEqual([1, 2]);
  });
});
