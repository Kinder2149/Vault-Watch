// État de la sauvegarde cloud tel que l'écran le dit : une ligne par cause, plus le cas normal.
import { describe, it, expect } from 'vitest';
import { etatSauvegarde } from '../src/backup.js';

const derniere = new Date();
const apres = new Date(derniere.getTime() + 60_000).toISOString();
const avant = new Date(derniere.getTime() - 60_000).toISOString();

describe('etatSauvegarde', () => {
  it('cas normal : sauvegardé, rien à faire', () => {
    const e = etatSauvegarde({ enAttente: false, derniere, essai: null });
    expect(e.niveau).toBe('ok');
    expect(e.titre).toMatch(/^Sauvegardé /);
    expect(e.action).toBeNull();
  });

  it('jamais sauvegardé : invite à une première sauvegarde', () => {
    const e = etatSauvegarde({ enAttente: false, derniere: null, essai: null });
    expect(e.niveau).toBe('ok');
    expect(e.titre).toBe('Pas encore sauvegardé');
  });

  it('en attente sans blocage : l’envoi automatique s’en charge', () => {
    const e = etatSauvegarde({ enAttente: true, derniere, essai: null });
    expect(e.niveau).toBe('attente');
    expect(e.action).toBeNull();
  });

  it('interrupteur coupé : propose le geste manuel', () => {
    const e = etatSauvegarde({ enAttente: true, derniere, essai: null, autoActive: false });
    expect(e.niveau).toBe('attente');
    expect(e.cause).toBe('desactivee');
    expect(e.action).toBe('Sauvegarder maintenant');
  });

  it.each([
    [{ raison: 'conflit' }, 'conflit', 'Choisir la version à garder'],
    [{ raison: 'autorisation-indisponible' }, 'autorisation', 'Reconnecter'],
    [{ raison: 'autorisation' }, 'autorisation', 'Reconnecter'],
    [{ raison: 'hors-ligne' }, 'hors-ligne', 'Réessayer'],
    [{ raison: 'echec', message: 'boom' }, 'erreur', 'Réessayer'],
  ])('bloqué par %o', (essai, cause, action) => {
    const e = etatSauvegarde({ enAttente: true, derniere, essai: { fait: false, quand: apres, ...essai } });
    expect(e.niveau).toBe('bloque');
    expect(e.cause).toBe(cause);
    expect(e.action).toBe(action);
  });

  it('l’erreur garde son message pour le diagnostic', () => {
    const e = etatSauvegarde({ enAttente: true, derniere, essai: { fait: false, quand: apres, raison: 'echec', message: 'boom' } });
    expect(e.detail).toContain('boom');
  });

  it('un essai plus ancien que la dernière sauvegarde ne bloque plus rien', () => {
    const e = etatSauvegarde({ enAttente: true, derniere, essai: { fait: false, quand: avant, raison: 'conflit' } });
    expect(e.niveau).toBe('attente');
  });

  it('hors connexion sans essai raté : le dit quand même', () => {
    const e = etatSauvegarde({ enAttente: true, derniere, essai: null, enLigne: false });
    expect(e.cause).toBe('hors-ligne');
  });

  it('rien en attente : un vieil échec ne s’affiche pas', () => {
    const e = etatSauvegarde({ enAttente: false, derniere, essai: { fait: false, quand: apres, raison: 'conflit' } });
    expect(e.niveau).toBe('ok');
  });
});
