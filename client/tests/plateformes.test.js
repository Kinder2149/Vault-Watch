// « Mes plateformes » : une sélection partagée, et le filtre « sur mes plateformes » (abonnement seulement).
import { describe, it, expect, beforeEach } from 'vitest';
import {
  lirePlateformes,
  ecrirePlateformes,
  nomsDesPlateformes,
  estSurMesPlateformes,
  offresInconnues,
  filtrerSurMesPlateformes,
} from '../src/plateformes.js';
import { appliquerFiltresBiblio, FILTRES_BIBLIO_VIDES, filtresBiblioActifs } from '../src/filtres.js';

const PROPOSEES = [
  { id: 8, name: 'Netflix' },
  { id: 337, name: 'Disney Plus' },
  { id: 381, name: 'Canal+' },
];
const plateforme = (name) => ({ name, logoUrl: null });
const titre = (id, flatrate = [], extra = {}) => ({
  id, mediaType: 'movie', title: `Titre ${id}`, releaseDate: '2020-01-01',
  providers: { flatrate: flatrate.map(plateforme), rent: [], buy: [] }, ...extra,
});

beforeEach(() => localStorage.clear());

describe('sélection', () => {
  it('rien de choisi au départ', () => {
    expect(lirePlateformes()).toEqual([]);
  });

  it('écrit et relit la sélection, sans doublon ni valeur étrangère', () => {
    expect(ecrirePlateformes([8, 337, 8, 'x'])).toEqual([8, 337]);
    expect(lirePlateformes()).toEqual([8, 337]);
  });

  it('reprend la sélection que Découvrir gardait sous son ancienne clé, une fois', () => {
    localStorage.setItem('decouvrir-plateformes', JSON.stringify([8, 381]));
    expect(lirePlateformes()).toEqual([8, 381]);
    expect(JSON.parse(localStorage.getItem('mes-plateformes'))).toEqual([8, 381]);

    ecrirePlateformes([337]); // le nouveau choix prime sur l'ancienne clé
    expect(lirePlateformes()).toEqual([337]);
  });

  it('un stockage illisible donne une sélection vide, sans planter', () => {
    localStorage.setItem('mes-plateformes', '{pas du json');
    expect(lirePlateformes()).toEqual([]);
  });
});

describe('noms des plateformes choisies', () => {
  it('traduit les identifiants en noms, sans tenir compte de la casse ni des accents', () => {
    const noms = nomsDesPlateformes([8, 381], PROPOSEES);
    expect(noms.has('netflix')).toBe(true);
    expect(noms.has('canal+')).toBe(true);
    expect(noms.has('disney plus')).toBe(false);
  });

  it('ignore un identifiant que la liste ne connaît plus', () => {
    expect(nomsDesPlateformes([999], PROPOSEES).size).toBe(0);
  });
});

describe('sur mes plateformes', () => {
  const noms = nomsDesPlateformes([8, 337], PROPOSEES);

  it('garde un titre dont un abonnement est chez moi', () => {
    expect(estSurMesPlateformes(titre(1, ['Netflix']), noms)).toBe(true);
    expect(estSurMesPlateformes(titre(1, ['Canal+', 'DISNEY PLUS']), noms)).toBe(true);
  });

  it('écarte un titre disponible seulement ailleurs', () => {
    expect(estSurMesPlateformes(titre(1, ['Canal+']), noms)).toBe(false);
  });

  it('la location et l’achat ne comptent pas : abonnement seulement', () => {
    const t = titre(1, [], { providers: { flatrate: [], rent: [plateforme('Netflix')], buy: [plateforme('Netflix')] } });
    expect(estSurMesPlateformes(t, noms)).toBe(false);
  });

  it('un titre aux offres inconnues n’est pas « sur mes plateformes » et se reconnaît', () => {
    const inconnu = titre(1, [], { providers: null });
    expect(estSurMesPlateformes(inconnu, noms)).toBe(false);
    expect(offresInconnues(inconnu)).toBe(true);
    expect(offresInconnues(titre(2))).toBe(false);
  });

  it('filtrerSurMesPlateformes : sans plateforme choisie, rien n’est filtré', () => {
    const items = [titre(1, ['Netflix']), titre(2, [])];
    expect(filtrerSurMesPlateformes(items, new Set())).toBe(items);
    expect(filtrerSurMesPlateformes(items, noms).map((i) => i.id)).toEqual([1]);
  });
});

describe('filtre de la bibliothèque', () => {
  const items = [titre(1, ['Netflix']), titre(2, ['Canal+']), titre(3, [], { providers: null }), titre(4, ['Disney Plus'])];
  const noms = nomsDesPlateformes([8, 337], PROPOSEES);

  it('« sur mes plateformes » ne garde que les titres abonnement chez moi', () => {
    const f = { ...FILTRES_BIBLIO_VIDES, surMesPlateformes: true };
    expect(appliquerFiltresBiblio(items, f, new Date(), { nomsPlateformes: noms }).map((i) => i.id)).toEqual([1, 4]);
  });

  it('désactivé, ou sans plateforme choisie : tout est montré', () => {
    expect(appliquerFiltresBiblio(items, FILTRES_BIBLIO_VIDES, new Date(), { nomsPlateformes: noms })).toHaveLength(4);
    const f = { ...FILTRES_BIBLIO_VIDES, surMesPlateformes: true };
    expect(appliquerFiltresBiblio(items, f, new Date(), { nomsPlateformes: new Set() })).toHaveLength(4);
  });

  it('se combine avec les autres filtres (année, tri)', () => {
    const vieux = [titre(1, ['Netflix'], { releaseDate: '1985-01-01' }), titre(4, ['Disney Plus'], { releaseDate: '2021-06-01' })];
    const f = { ...FILTRES_BIBLIO_VIDES, surMesPlateformes: true, periode: '2020s' };
    expect(appliquerFiltresBiblio(vieux, f, new Date('2026-10-27T00:00:00Z'), { nomsPlateformes: noms }).map((i) => i.id)).toEqual([4]);
  });

  it('compte parmi les filtres actifs (le point sur « Filtres »)', () => {
    expect(filtresBiblioActifs(FILTRES_BIBLIO_VIDES)).toBe(false);
    expect(filtresBiblioActifs({ ...FILTRES_BIBLIO_VIDES, surMesPlateformes: true })).toBe(true);
  });
});
