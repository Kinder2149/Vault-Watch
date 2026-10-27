// Disponibilité d'un titre : cinq états, et jamais de fausse affirmation quand une donnée manque.
import { describe, it, expect } from 'vitest';
import { etatDisponibilite } from '../src/status.js';

const AUJOURDHUI = '2026-10-27';
const netflix = { name: 'Netflix', logoUrl: 'https://image.tmdb.org/t/p/w45/n.jpg' };
const disney = { name: 'Disney Plus', logoUrl: null };
const canal = { name: 'Canal+', logoUrl: null };
const apple = { name: 'Apple TV', logoUrl: null };
const aucune = { flatrate: [], rent: [], buy: [] };
const base = { aujourdhui: AUJOURDHUI, releaseDate: '2025-05-01', id: 42, providers: aucune, enSalle: new Set() };

describe('etatDisponibilite', () => {
  it('pas encore sorti : date future, avec la date en clair', () => {
    const e = etatDisponibilite({ ...base, releaseDate: '2026-11-21', providers: { ...aucune, flatrate: [netflix] } });
    expect(e).toMatchObject({ etat: 'a_venir', libelle: 'Pas encore sorti' });
    expect(e.detail).toBe('Sortie le 21/11/2026');
  });

  it('pas encore sorti : annoncé sans date (statut TMDB « Planned »)', () => {
    const e = etatDisponibilite({ ...base, releaseDate: null, status: 'Planned', providers: null });
    expect(e).toMatchObject({ etat: 'a_venir' });
    expect(e.detail).toMatch(/date inconnue/);
  });

  it('un film sorti sans date ni statut : on ne dit rien de la date', () => {
    expect(etatDisponibilite({ ...base, releaseDate: null, status: 'Released', providers: null })).toBeNull();
  });

  it('au cinéma : à l’affiche et sans abonnement', () => {
    const e = etatDisponibilite({ ...base, enSalle: new Set([42]) });
    expect(e).toMatchObject({ etat: 'au_cinema', libelle: 'Au cinéma' });
  });

  it('au cinéma même si le film se loue déjà', () => {
    const e = etatDisponibilite({ ...base, enSalle: new Set([42]), providers: { ...aucune, rent: [apple] } });
    expect(e.etat).toBe('au_cinema');
  });

  it('à l’affiche mais aussi sur une plateforme (reprise d’un classique) : disponible d’abord', () => {
    const e = etatDisponibilite({ ...base, enSalle: new Set([42]), providers: { ...aucune, flatrate: [disney] } });
    expect(e.etat).toBe('disponible');
  });

  it('disponible : les plateformes sont rendues, jusqu’à trois noms dans le détail', () => {
    const e = etatDisponibilite({
      ...base,
      providers: { ...aucune, flatrate: [netflix, disney, canal, apple] },
    });
    expect(e.etat).toBe('disponible');
    expect(e.plateformes).toHaveLength(4);
    expect(e.detail).toBe('Netflix, Disney Plus, Canal+');
  });

  it('location ou achat seulement : liste dédoublonnée', () => {
    const e = etatDisponibilite({ ...base, providers: { ...aucune, rent: [apple], buy: [apple, canal] } });
    expect(e.etat).toBe('location_achat');
    expect(e.plateformes.map((p) => p.name)).toEqual(['Apple TV', 'Canal+']);
  });

  it('sorti, aucune offre, pas à l’affiche : sorti sans streaming', () => {
    const e = etatDisponibilite(base);
    expect(e).toMatchObject({ etat: 'sorti_sans_streaming', libelle: 'Sorti, pas en streaming' });
  });

  describe('séries', () => {
    const serie = { ...base, isSeries: true, enSalle: null };

    it('à venir', () => {
      expect(etatDisponibilite({ ...serie, releaseDate: '2027-01-10' }).etat).toBe('a_venir');
    });

    it('disponible', () => {
      const e = etatDisponibilite({ ...serie, providers: { ...aucune, flatrate: [netflix] } });
      expect(e).toMatchObject({ etat: 'disponible' });
    });

    it('jamais « au cinéma », même si son identifiant figure dans la liste', () => {
      const e = etatDisponibilite({ ...serie, enSalle: new Set([42]) });
      expect(e.etat).toBe('sorti_sans_streaming');
      expect(e.libelle).toBe('Pas disponible en streaming');
    });

    it('sans offre : le dit même si la liste « en salle » est inconnue (elle ne la concerne pas)', () => {
      expect(etatDisponibilite(serie).etat).toBe('sorti_sans_streaming');
    });
  });

  describe('données manquantes : jamais de fausse affirmation', () => {
    it('offres inconnues : rien (sauf la date)', () => {
      expect(etatDisponibilite({ ...base, providers: null })).toBeNull();
    });

    it('offres inconnues mais film à l’affiche : « Au cinéma », c’est vrai dans tous les cas', () => {
      const e = etatDisponibilite({ ...base, providers: null, enSalle: new Set([42]) });
      expect(e).toMatchObject({ etat: 'au_cinema' });
    });

    it('offres inconnues, film à l’affiche, mais date future : « Pas encore sorti » d’abord', () => {
      const e = etatDisponibilite({ ...base, providers: null, releaseDate: '2026-10-28', enSalle: new Set([42]) });
      expect(e.etat).toBe('a_venir');
    });

    it('offres inconnues, série : rien (une série n’est jamais au cinéma)', () => {
      expect(etatDisponibilite({ ...base, isSeries: true, providers: null, enSalle: new Set([42]) })).toBeNull();
    });

    it('liste « en salle » inconnue : un film sans offre n’est ni au cinéma ni sorti sans streaming', () => {
      expect(etatDisponibilite({ ...base, enSalle: null })).toBeNull();
    });

    it('liste « en salle » inconnue : une offre connue reste affichée', () => {
      const e = etatDisponibilite({ ...base, enSalle: null, providers: { ...aucune, flatrate: [netflix] } });
      expect(e.etat).toBe('disponible');
    });

    it('offres sans champ de liste : traitées comme vides', () => {
      expect(etatDisponibilite({ ...base, providers: {} }).etat).toBe('sorti_sans_streaming');
    });
  });
});
