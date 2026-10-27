// M2 — filtres, tri et rubriques de l'accueil. Le réseau est simulé : on vérifie
// ce que l'application demande à TMDB et ce qu'elle fait des réponses.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  searchKeywords,
  discoverByKeyword,
  getRubrique,
  getPlateformes,
  fenetreDeRubrique,
} from '../src/tmdb.js';
import {
  appliquerFiltres,
  bornesDePeriode,
  filtresActifs,
  FILTRES_VIDES,
} from '../src/filtres.js';
import { setCatalogLanguage } from '../src/lang.js';

const AUJ = new Date('2026-09-21T12:00:00Z');
const appels = [];

function fauxTmdb(reponse) {
  vi.stubEnv('VITE_TMDB_API_KEY', 'cle-de-test');
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url) => {
      const u = new URL(url);
      appels.push({ chemin: u.pathname.replace('/3', ''), params: Object.fromEntries(u.searchParams) });
      const corps = reponse(u.pathname.replace('/3', ''), Object.fromEntries(u.searchParams));
      return { ok: true, status: 200, json: async () => corps };
    })
  );
}

beforeEach(() => {
  appels.length = 0;
  setCatalogLanguage('fr');
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const film = (id, titre, date, popularity, note = 7, votes = 500) => ({
  id, title: titre, release_date: date, popularity, vote_average: note, vote_count: votes,
});
const serie = (id, nom, date, popularity, note = 7, votes = 500) => ({
  id, name: nom, first_air_date: date, popularity, vote_average: note, vote_count: votes,
});

describe('Mot-clé — ce qui part chez TMDB', () => {
  it('la saisie part en recherche de mot-clé ; dix propositions au plus, avec id et nom', async () => {
    fauxTmdb(() => ({
      results: Array.from({ length: 14 }, (_, i) => ({ id: 100 + i, name: `marvel ${i}` })),
    }));
    const liste = await searchKeywords('marvel');
    expect(appels[0].chemin).toBe('/search/keyword');
    expect(appels[0].params.query).toBe('marvel');
    expect(liste).toHaveLength(10);
    expect(liste[0]).toEqual({ id: 100, name: 'marvel 0' });
  });

  it('un mot-clé : films et séries sont demandés avec with_keywords, par popularité', async () => {
    fauxTmdb((chemin) => ({
      results: chemin.endsWith('/movie')
        ? [film(1, 'Film', '2011-01-01', 10)]
        : [serie(2, 'Série', '2015-01-01', 20)],
    }));
    const items = await discoverByKeyword({ keyword: 180547, page: 2 });
    expect(appels).toHaveLength(2);
    for (const a of appels) {
      expect(a.params.with_keywords).toBe('180547');
      expect(a.params.sort_by).toBe('popularity.desc');
      expect(a.params.page).toBe('2');
      expect(a.params.with_watch_providers).toBeUndefined();
    }
    expect(items.map((i) => i.title)).toEqual(['Série', 'Film']);
  });

  it('« Films » ne demande que les films, « Séries » que les séries', async () => {
    fauxTmdb(() => ({ results: [] }));
    await discoverByKeyword({ keyword: 1, tv: false });
    expect(appels.map((a) => a.chemin)).toEqual(['/discover/movie']);
    appels.length = 0;
    await discoverByKeyword({ keyword: 1, movie: false });
    expect(appels.map((a) => a.chemin)).toEqual(['/discover/tv']);
  });

  it('« Sur mes plateformes » : titres disponibles chez elles (au choix) dans la région du catalogue', async () => {
    fauxTmdb(() => ({ results: [] }));
    await discoverByKeyword({ keyword: 1, plateformes: [337, 350] });
    for (const a of appels) {
      expect(a.params.with_watch_providers).toBe('337|350');
      expect(a.params.watch_region).toBe('FR');
    }
    appels.length = 0;
    setCatalogLanguage('en');
    await discoverByKeyword({ keyword: 1, plateformes: [8] });
    expect(appels[0].params.watch_region).toBe('US');
  });
});

describe('plateformes proposées', () => {
  it('les plus courantes de la région, sans doublon entre films et séries', async () => {
    fauxTmdb((chemin) => ({
      results: [
        { provider_id: 8, provider_name: 'Netflix', logo_path: '/n.png', display_priorities: { FR: 2 } },
        { provider_id: 337, provider_name: 'Disney Plus', logo_path: '/d.png', display_priorities: { FR: 1 } },
        ...(chemin.endsWith('/tv') ? [{ provider_id: 8, provider_name: 'Netflix', display_priorities: { FR: 2 } }] : []),
      ],
    }));
    const liste = await getPlateformes();
    expect(liste.map((p) => p.name)).toEqual(['Disney Plus', 'Netflix']);
    expect(appels.every((a) => a.params.watch_region === 'FR')).toBe(true);
  });
});

describe('accueil : Tendances / Nouveautés / À venir', () => {
  it('Nouveautés = 60 derniers jours, À venir = 90 jours à venir', () => {
    expect(fenetreDeRubrique('nouveautes', AUJ)).toEqual({ from: '2026-07-23', to: '2026-09-21' });
    expect(fenetreDeRubrique('avenir', AUJ)).toEqual({ from: '2026-09-22', to: '2026-12-20' });
    expect(fenetreDeRubrique('tendances', AUJ)).toBeNull();
  });

  it('Tendances passe par les tendances, Nouveautés et À venir par la découverte', async () => {
    fauxTmdb((chemin) => ({
      results: chemin.startsWith('/trending')
        ? [{ ...film(9, 'Tendance', '2026-01-01', 1), media_type: 'movie' }]
        : [film(1, 'Sorti', '2026-08-01', 5)],
    }));
    const tendances = await getRubrique({ rubrique: 'tendances', mediaType: 'all' });
    expect(appels[0].chemin).toContain('/trending');
    expect(tendances.map((t) => t.title)).toEqual(['Tendance']);

    appels.length = 0;
    await getRubrique({ rubrique: 'nouveautes', mediaType: 'all' });
    await getRubrique({ rubrique: 'avenir', mediaType: 'movie' });
    expect(appels.map((a) => a.chemin)).toEqual(['/discover/movie', '/discover/tv', '/discover/movie']);
    const avenir = appels[2].params;
    expect(avenir['primary_release_date.gte'] > new Date().toISOString().slice(0, 10)).toBe(true);
  });

  it('les talk-shows et la télé-réalité ne polluent pas les nouveautés télé', async () => {
    fauxTmdb(() => ({ results: [] }));
    await getRubrique({ rubrique: 'nouveautes', mediaType: 'tv' });
    expect(appels[0].params.without_genres).toBe('10767,10763,10764');
  });

  it('les deux rubriques donnent des listes différentes', async () => {
    fauxTmdb((chemin, p) => ({
      results: p['primary_release_date.gte'] > '2026-09-01'
        ? [film(2, 'Pas encore sorti', '2026-11-01', 5)]
        : [film(1, 'Déjà sorti', '2026-08-01', 5)],
    }));
    const nouveautes = await getRubrique({ rubrique: 'nouveautes', mediaType: 'movie' });
    const avenir = await getRubrique({ rubrique: 'avenir', mediaType: 'movie' });
    expect(nouveautes.map((t) => t.title)).toEqual(['Déjà sorti']);
    expect(avenir.map((t) => t.title)).toEqual(['Pas encore sorti']);
  });
});

describe('Titre et Acteur : année et tri sur ce qui est affiché', () => {
  const liste = [
    { id: 1, title: 'A', releaseDate: '2012-05-01', note: 6, votes: 900 },
    { id: 2, title: 'B', releaseDate: '2024-05-01', note: 8, votes: 900 },
    { id: 3, title: 'C', releaseDate: '1985-05-01', note: 9, votes: 900 },
    { id: 4, title: 'D', releaseDate: '2027-05-01', note: null, votes: 0 }, // pas encore sorti
    { id: 5, title: 'E', releaseDate: null, note: 10, votes: 1 }, // sans date, un seul vote
  ];
  const titres = (l) => l.map((x) => x.title);

  it('sans filtre, rien ne change', () => {
    expect(titres(appliquerFiltres(liste, FILTRES_VIDES, AUJ))).toEqual(['A', 'B', 'C', 'D', 'E']);
  });

  it('filtre par année : ne garde que la période, écarte ce qui n’a pas de date', () => {
    expect(titres(appliquerFiltres(liste, { ...FILTRES_VIDES, periode: '2010s' }, AUJ))).toEqual(['A']);
    expect(titres(appliquerFiltres(liste, { ...FILTRES_VIDES, periode: 'avant1990' }, AUJ))).toEqual(['C']);
  });

  it('Plus récent : le plus récent déjà sorti d’abord, le pas encore sorti à la fin', () => {
    expect(titres(appliquerFiltres(liste, { ...FILTRES_VIDES, tri: 'recent' }, AUJ))).toEqual(['B', 'A', 'C', 'D', 'E']);
  });

  it('Plus ancien : du plus ancien au plus récent', () => {
    expect(titres(appliquerFiltres(liste, { ...FILTRES_VIDES, tri: 'ancien' }, AUJ))).toEqual(['C', 'A', 'B', 'D', 'E']);
  });

  it('Mieux notés : par note, un titre à un seul vote ne passe pas devant', () => {
    expect(titres(appliquerFiltres(liste, { ...FILTRES_VIDES, tri: 'notes' }, AUJ))).toEqual(['C', 'B', 'A', 'D', 'E']);
  });

  it('le point « filtres actifs » suit l’état', () => {
    expect(filtresActifs(FILTRES_VIDES)).toBe(false);
    expect(filtresActifs({ ...FILTRES_VIDES, tri: 'recent' })).toBe(true);
    expect(filtresActifs({ ...FILTRES_VIDES, plateformes: [8] })).toBe(true);
    expect(bornesDePeriode('annee', AUJ)).toEqual({ from: '2026-01-01', to: '2026-12-31' });
  });
});
