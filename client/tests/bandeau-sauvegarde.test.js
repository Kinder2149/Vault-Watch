// Bandeau d'alerte de la sauvegarde : rien dans le cas normal, une alerte par blocage.
import { describe, it, expect } from 'vitest';
import { bandeauSauvegarde, DELAI_BANDEAU_MS } from '../src/backup.js';

const MIN = 60_000;
const maintenant = new Date('2026-10-27T10:00:00Z');
const derniere = new Date(maintenant.getTime() - 60 * MIN);
const apres = new Date(maintenant.getTime() - 2 * MIN).toISOString(); // un essai plus récent que la dernière sauvegarde
const depuis = (minutes) => new Date(maintenant.getTime() - minutes * MIN);

const base = { enAttente: true, derniere, essai: null, autoActive: true, enLigne: true, maintenant };
const essai = (raison, extra = {}) => ({ fait: false, quand: apres, raison, ...extra });

describe('bandeauSauvegarde', () => {
  it('rien à sauvegarder : aucun bandeau', () => {
    expect(bandeauSauvegarde({ ...base, enAttente: false })).toBeNull();
  });

  it('modification normale : aucun bandeau, même pendant les 30 s d’attente', () => {
    expect(bandeauSauvegarde({ ...base, depuis: depuis(0) })).toBeNull();
    expect(bandeauSauvegarde({ ...base, depuis: depuis(1) })).toBeNull();
  });

  it('conflit : tout de suite, avec le bouton qui mène au choix', () => {
    const b = bandeauSauvegarde({ ...base, essai: essai('conflit'), depuis: depuis(0) });
    expect(b).toMatchObject({ cause: 'conflit', action: 'Choisir la version' });
    expect(b.texte).toMatch(/autre appareil/);
  });

  it.each(['autorisation', 'autorisation-indisponible'])('autorisation (%s) : tout de suite', (raison) => {
    const b = bandeauSauvegarde({ ...base, essai: essai(raison), depuis: depuis(0) });
    expect(b).toMatchObject({ cause: 'autorisation', action: 'Reconnecter' });
  });

  it('hors connexion : rien avant 10 min, puis une alerte qui dit depuis combien de temps', () => {
    const e = essai('hors-ligne');
    expect(bandeauSauvegarde({ ...base, essai: e, depuis: depuis(9) })).toBeNull();
    const b = bandeauSauvegarde({ ...base, essai: e, depuis: depuis(11) });
    expect(b).toMatchObject({ cause: 'hors-ligne', action: 'Réessayer' });
    expect(b.texte).toBe('Pas sauvegardé depuis 11 min : pas de connexion.');
  });

  it('hors connexion déclaré par le téléphone, sans essai raté : même règle', () => {
    expect(bandeauSauvegarde({ ...base, enLigne: false, depuis: depuis(3) })).toBeNull();
    expect(bandeauSauvegarde({ ...base, enLigne: false, depuis: depuis(12) })).toMatchObject({ cause: 'hors-ligne' });
  });

  it('erreur : rien avant 10 min, puis une alerte', () => {
    const e = essai('echec', { message: 'boom' });
    expect(bandeauSauvegarde({ ...base, essai: e, depuis: depuis(5) })).toBeNull();
    const b = bandeauSauvegarde({ ...base, essai: e, depuis: depuis(15) });
    expect(b).toMatchObject({ cause: 'erreur', action: 'Réessayer' });
    expect(b.texte).toContain('erreur');
  });

  it('interrupteur coupé : rien avant 10 min, puis un rappel manuel', () => {
    const entree = { ...base, autoActive: false };
    expect(bandeauSauvegarde({ ...entree, depuis: depuis(2) })).toBeNull();
    expect(bandeauSauvegarde({ ...entree, depuis: depuis(30) })).toMatchObject({
      cause: 'desactivee',
      action: 'Sauvegarder',
    });
  });

  it('filet : une attente sans cause connue qui dure anormalement longtemps est signalée', () => {
    const b = bandeauSauvegarde({ ...base, depuis: depuis(25) });
    expect(b).toMatchObject({ cause: 'longue', action: 'Sauvegarder' });
    expect(b.texte).toBe('Des modifications attendent depuis 25 min.');
  });

  it('la durée passe en heures au-delà de 60 min', () => {
    const b = bandeauSauvegarde({ ...base, essai: essai('hors-ligne'), depuis: depuis(125) });
    expect(b.texte).toBe('Pas sauvegardé depuis 2 h : pas de connexion.');
  });

  it('un vieux conflit, plus ancien que la dernière sauvegarde, ne réveille pas le bandeau', () => {
    const vieux = { fait: false, raison: 'conflit', quand: new Date(derniere.getTime() - MIN).toISOString() };
    expect(bandeauSauvegarde({ ...base, essai: vieux, depuis: depuis(0) })).toBeNull();
  });

  it('le seuil est bien de 10 minutes', () => {
    expect(DELAI_BANDEAU_MS).toBe(10 * MIN);
  });
});
