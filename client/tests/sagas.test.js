// Regroupement des films d'une même saga : à partir de deux films de la vue, dans l'ordre de sortie,
// à la place du premier membre.
import { describe, it, expect } from 'vitest';
import { regrouperSagas, nomDeSaga, enteteDeSaga } from '../src/sagas.js';

const film = (id, title, releaseDate, sagaId = null, sagaNom = null) => ({
  id, title, releaseDate, mediaType: 'movie', sagaId, sagaNom,
});

const SW4 = film(4, 'Un nouvel espoir', '1977-05-25', 10, 'Star Wars - Saga');
const SW5 = film(5, 'L’Empire contre-attaque', '1980-05-21', 10, 'Star Wars - Saga');
const SW1 = film(1, 'La Menace fantôme', '1999-05-19', 10, 'Star Wars - Saga');
const DUNE1 = film(21, 'Dune', '2021-09-15', 20, 'Dune Collection');
const DUNE2 = film(22, 'Dune : Deuxième partie', '2024-02-28', 20, 'Dune Collection');
const SEUL = film(30, 'Parasite', '2019-05-30');
const UNIQUE = film(31, 'Seul de sa saga', '2010-01-01', 40, 'Autre saga');

describe('regrouperSagas', () => {
  it('regroupe les films d’une même saga, dans l’ordre de sortie', () => {
    const blocs = regrouperSagas([SW1, SW5, SW4]);
    expect(blocs).toHaveLength(1);
    expect(blocs[0].saga.films.map((f) => f.id)).toEqual([4, 5, 1]);
    expect(blocs[0].saga.id).toBe(10);
  });

  it('un film seul de sa saga reste libre (une saga n’est un groupe qu’à partir de deux films de la vue)', () => {
    const blocs = regrouperSagas([UNIQUE, SEUL]);
    expect(blocs.map((b) => b.film?.id)).toEqual([31, 30]);
  });

  it('le groupe prend la place de son premier membre dans l’ordre de la vue', () => {
    const blocs = regrouperSagas([SEUL, SW1, DUNE2, SW4, DUNE1]);
    expect(blocs.map((b) => (b.saga ? `saga:${b.saga.id}` : `film:${b.film.id}`))).toEqual([
      'film:30', 'saga:10', 'saga:20',
    ]);
  });

  it('respecte le tri de la vue : tri inversé, le groupe suit son premier membre', () => {
    const blocs = regrouperSagas([DUNE1, SEUL, SW4, SW1, DUNE2]);
    expect(blocs.map((b) => (b.saga ? `saga:${b.saga.id}` : `film:${b.film.id}`))).toEqual([
      'saga:20', 'film:30', 'saga:10',
    ]);
  });

  it('compte seulement les films présents dans la vue (un filtre peut laisser un seul film)', () => {
    const blocs = regrouperSagas([SW4, SEUL]); // la vue ne garde qu'un Star Wars
    expect(blocs.every((b) => b.film)).toBe(true);
  });

  it('réglage coupé : liste à plat, ordre inchangé', () => {
    const blocs = regrouperSagas([SW1, SEUL, SW4], { actif: false });
    expect(blocs.map((b) => b.film.id)).toEqual([1, 30, 4]);
  });

  it('un film sans relevé de saga (sagaId nul) n’est jamais regroupé', () => {
    const a = film(50, 'A', '2000-01-01');
    const b = film(51, 'B', '2001-01-01');
    expect(regrouperSagas([a, b]).every((x) => x.film)).toBe(true);
  });

  it('une vue vide donne aucun bloc', () => {
    expect(regrouperSagas([])).toEqual([]);
  });

  it('deux sagas voisines restent deux groupes distincts', () => {
    const blocs = regrouperSagas([SW1, SW4, DUNE1, DUNE2]);
    expect(blocs.map((b) => b.saga.id)).toEqual([10, 20]);
  });

  it('prend le nom de la saga rangé dans les films', () => {
    expect(regrouperSagas([SW1, SW4])[0].saga.nom).toBe('Star Wars - Saga');
  });
});

describe('noms et en-têtes', () => {
  it.each([
    ['Star Wars - Saga', 'Star Wars'],
    ['Dune Collection', 'Dune'],
    ['La Saga Harry Potter', 'Harry Potter'],
    ['Saga Matrix', 'Matrix'],
    ['Captain Marvel – Saga', 'Captain Marvel'],
    ['Le Seigneur des anneaux', 'Le Seigneur des anneaux'],
    ['Saga', 'Saga'],
    ['', ''],
  ])('%s → %s', (brut, propre) => {
    expect(nomDeSaga(brut)).toBe(propre);
  });

  it('l’en-tête dit « Saga <nom> — N titres »', () => {
    expect(enteteDeSaga('Star Wars - Saga', 6)).toBe('Saga Star Wars — 6 titres');
    expect(enteteDeSaga('Dune Collection', 2)).toBe('Saga Dune — 2 titres');
  });
});
