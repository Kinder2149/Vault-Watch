// « Regardable ce soir » : une seule règle pour Ce soir et l'idée du soir.
// Regardable : état inconnu, disponible, en location / achat. Pas regardable : pas encore sorti,
// au cinéma, sorti sans streaming.
import { describe, it, expect } from 'vitest';
import { estRegardable, etatDeTitre } from '../src/status.js';
import { candidatsIdee, ideeDuSoir } from '../src/idee.js';

const AUJOURDHUI = '2026-10-27';
const NETFLIX = { name: 'Netflix', logoUrl: null };
const APPLE = { name: 'Apple TV', logoUrl: null };
const offres = (extra) => ({ flatrate: [], rent: [], buy: [], ...extra });

const titre = (id, extra = {}) => ({
  id,
  mediaType: 'movie',
  title: `Titre ${id}`,
  status: 'a_voir',
  releaseDate: '2025-01-01',
  providers: null,
  ...extra,
});

describe('estRegardable', () => {
  const salle = new Set([1]);

  it.each([
    ['inconnu (jamais relevé)', titre(10), new Set(), true],
    ['disponible en abonnement', titre(10, { providers: offres({ flatrate: [NETFLIX] }) }), new Set(), true],
    ['en location / achat', titre(10, { providers: offres({ rent: [APPLE] }) }), new Set(), true],
    ['pas encore sorti', titre(10, { releaseDate: '2026-12-01' }), new Set(), false],
    ['au cinéma', titre(1, { providers: offres() }), salle, false],
    ['au cinéma, offres encore inconnues', titre(1), salle, false],
    ['sorti, aucune offre', titre(10, { providers: offres() }), new Set(), false],
  ])('%s', (_nom, t, enSalle, attendu) => {
    expect(estRegardable(t, enSalle, AUJOURDHUI)).toBe(attendu);
  });

  it('liste « au cinéma » inconnue : un film sans offre n’est pas écarté (on ne devine pas)', () => {
    expect(estRegardable(titre(10, { providers: offres() }), null, AUJOURDHUI)).toBe(true);
    expect(estRegardable(titre(10, { providers: offres() }), undefined, AUJOURDHUI)).toBe(true);
  });

  it('une série sans offre n’est pas regardable ; une série disponible l’est', () => {
    const serie = (providers) => titre(20, { mediaType: 'tv', providers });
    expect(estRegardable(serie(offres()), null, AUJOURDHUI)).toBe(false);
    expect(estRegardable(serie(offres({ flatrate: [NETFLIX] })), null, AUJOURDHUI)).toBe(true);
  });

  it('une série n’est jamais « au cinéma » même si son identifiant figure dans la liste', () => {
    const serie = titre(1, { mediaType: 'tv', providers: offres({ flatrate: [NETFLIX] }) });
    expect(estRegardable(serie, new Set([1]), AUJOURDHUI)).toBe(true);
  });

  it('etatDeTitre rend l’état affiché sur la fiche', () => {
    expect(etatDeTitre(titre(1, { providers: offres() }), new Set([1]), AUJOURDHUI).etat).toBe('au_cinema');
  });
});

describe('idée du soir', () => {
  const items = [
    titre(1, { providers: offres() }), // au cinéma
    titre(2, { releaseDate: '2026-12-01' }), // à venir
    titre(3, { providers: offres() }), // sorti sans streaming
    titre(4, { providers: offres({ flatrate: [NETFLIX] }) }), // disponible
    titre(5, { providers: offres({ rent: [APPLE] }) }), // location
    titre(6), // inconnu
    titre(7, { status: 'vu' }),
  ];
  const salle = new Set([1]);

  it('les candidats sont les titres à voir regardables', () => {
    const ids = candidatsIdee(items, salle).map((i) => i.id).sort();
    expect(ids).toEqual([4, 5, 6]);
  });

  it('l’idée n’est jamais un titre non regardable, sur plusieurs tirages et plusieurs jours', () => {
    for (let jour = 1; jour <= 15; jour += 1) {
      for (let rang = 0; rang < 6; rang += 1) {
        const idee = ideeDuSoir(items, { profileId: 'p', date: `2026-10-${String(jour).padStart(2, '0')}`, rang, enSalle: salle });
        expect([4, 5, 6]).toContain(idee.id);
      }
    }
  });

  it('un titre sans relevé reste candidat', () => {
    expect(candidatsIdee([titre(6)], new Set()).map((i) => i.id)).toEqual([6]);
  });

  it('rien de regardable : pas d’idée', () => {
    expect(ideeDuSoir([titre(1, { providers: offres() })], { profileId: 'p', date: '2026-10-27', enSalle: salle })).toBeNull();
  });
});
