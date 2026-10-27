// Filtres de Découvrir : type, année, genre, tri — sur les titres déjà chargés par chaque rangée.
import { describe, it, expect } from 'vitest';
import {
  FILTRES_DECOUVERTE_VIDES,
  filtresDecouverteActifs,
  appliquerFiltresDecouverte,
} from '../src/filtres.js';

const AUJ = new Date('2026-10-27T00:00:00Z');
const t = (id, mediaType, releaseDate, genreKeys = [], extra = {}) => ({
  id, mediaType, title: `T${id}`, releaseDate, genreKeys, ...extra,
});

const LISTE = [
  t(1, 'movie', '2024-05-01', ['action', 'scifi'], { note: 7.1, votes: 900 }),
  t(2, 'tv', '2021-03-01', ['drame'], { note: 8.4, votes: 1200 }),
  t(3, 'movie', '1995-01-01', ['drame'], { note: 8.9, votes: 4000 }),
  t(4, 'movie', '2026-12-01', ['action'], { note: 6.0, votes: 10 }),
  t(5, 'tv', null, [], { note: 9.9, votes: 3 }),
];
const f = (patch) => ({ ...FILTRES_DECOUVERTE_VIDES, ...patch });
const ids = (l) => l.map((i) => i.id);

describe('appliquerFiltresDecouverte', () => {
  it('sans filtre : la liste telle qu’elle est arrivée', () => {
    expect(ids(appliquerFiltresDecouverte(LISTE, FILTRES_DECOUVERTE_VIDES, AUJ))).toEqual([1, 2, 3, 4, 5]);
  });

  it('type : films seulement, séries seulement', () => {
    expect(ids(appliquerFiltresDecouverte(LISTE, f({ media: 'movie' }), AUJ))).toEqual([1, 3, 4]);
    expect(ids(appliquerFiltresDecouverte(LISTE, f({ media: 'tv' }), AUJ))).toEqual([2, 5]);
  });

  it('année : garde la période, écarte les titres sans date', () => {
    expect(ids(appliquerFiltresDecouverte(LISTE, f({ periode: '2020s' }), AUJ))).toEqual([1, 2, 4]);
    expect(ids(appliquerFiltresDecouverte(LISTE, f({ periode: '1990s' }), AUJ))).toEqual([3]);
  });

  it('genre : garde les titres du genre, écarte ceux sans genre connu', () => {
    expect(ids(appliquerFiltresDecouverte(LISTE, f({ genre: 'drame' }), AUJ))).toEqual([2, 3]);
    expect(ids(appliquerFiltresDecouverte(LISTE, f({ genre: 'scifi' }), AUJ))).toEqual([1]);
  });

  it('tri « plus récent » : les titres sortis d’abord, du plus récent au plus ancien, les autres à la fin', () => {
    expect(ids(appliquerFiltresDecouverte(LISTE, f({ tri: 'recent' }), AUJ))).toEqual([1, 2, 3, 4, 5]);
  });

  it('tri « plus ancien »', () => {
    expect(ids(appliquerFiltresDecouverte(LISTE, f({ tri: 'ancien' }), AUJ))).toEqual([3, 2, 1, 4, 5]);
  });

  it('tri « mieux notés » : sous le seuil de votes, à la fin', () => {
    expect(ids(appliquerFiltresDecouverte(LISTE, f({ tri: 'notes' }), AUJ))).toEqual([3, 2, 1, 4, 5]);
  });

  it('se combinent : films des années 2020, genre action', () => {
    expect(ids(appliquerFiltresDecouverte(LISTE, f({ media: 'movie', periode: '2020s', genre: 'action' }), AUJ))).toEqual([1, 4]);
  });

  it('la plateforme n’est pas un filtre d’application : elle ne change pas la liste', () => {
    expect(ids(appliquerFiltresDecouverte(LISTE, f({ surMesPlateformes: true }), AUJ))).toEqual([1, 2, 3, 4, 5]);
  });

  it('un titre sans clé de genre ne fait pas planter le filtre', () => {
    const sans = [{ id: 9, mediaType: 'movie', title: 'X', releaseDate: '2020-01-01' }];
    expect(appliquerFiltresDecouverte(sans, f({ genre: 'drame' }), AUJ)).toEqual([]);
  });
});

describe('filtresDecouverteActifs', () => {
  it('faux au départ, vrai dès qu’un filtre s’écarte (le point sur « Filtres »)', () => {
    expect(filtresDecouverteActifs(FILTRES_DECOUVERTE_VIDES)).toBe(false);
    for (const patch of [{ media: 'tv' }, { periode: '2020s' }, { genre: 'drame' }, { tri: 'notes' }, { surMesPlateformes: true }]) {
      expect(filtresDecouverteActifs(f(patch))).toBe(true);
    }
  });
});
