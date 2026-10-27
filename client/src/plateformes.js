// « Mes plateformes » (mission B1) : les services de streaming auxquels on est abonné, choisis **une fois**
// dans Réglages et partagés par tous les écrans qui filtrent « sur mes plateformes ». Logique pure + un petit
// bout de stockage local ; aucun réseau.
//
// On range les identifiants TMDB des plateformes (ce que Découvrir envoie à TMDB). Les offres rangées dans le
// suivi, elles, ne portent que les **noms** : on passe donc par la liste des plateformes proposées pour
// traduire les identifiants en noms.

const CLE = 'mes-plateformes';
// Clé d'avant : Découvrir gardait sa propre sélection. Reprise une fois, au premier passage.
const ANCIENNE_CLE = 'decouvrir-plateformes';

function lire(cle) {
  try {
    const valeur = JSON.parse(localStorage.getItem(cle) || 'null');
    return Array.isArray(valeur) ? valeur.filter((v) => Number.isFinite(Number(v))).map(Number) : null;
  } catch {
    return null;
  }
}

export function lirePlateformes() {
  const courante = lire(CLE);
  if (courante) return courante;
  const ancienne = lire(ANCIENNE_CLE);
  if (ancienne) {
    ecrirePlateformes(ancienne); // la sélection de Découvrir devient « Mes plateformes »
    return ancienne;
  }
  return [];
}

export function ecrirePlateformes(ids) {
  const propres = [...new Set(ids.map(Number).filter(Number.isFinite))];
  try {
    localStorage.setItem(CLE, JSON.stringify(propres));
  } catch {
    /* stockage indisponible : le choix vaut pour la session */
  }
  return propres;
}

// La liste des plateformes proposées (identifiant + nom) est gardée sur l'appareil : le filtre doit marcher
// hors connexion, sans avoir à redemander à TMDB comment s'appelle la plateforme n° 8.
const CLE_PROPOSEES = 'plateformes-proposees';

export function memoriserPlateformes(proposees) {
  try {
    localStorage.setItem(
      CLE_PROPOSEES,
      JSON.stringify((proposees || []).map((p) => ({ id: p.id, name: p.name })))
    );
  } catch {
    /* stockage indisponible : la liste sera redemandée */
  }
}

export function plateformesMemorisees() {
  try {
    const liste = JSON.parse(localStorage.getItem(CLE_PROPOSEES) || '[]');
    return Array.isArray(liste) ? liste : [];
  } catch {
    return [];
  }
}

const normaliser = (nom) =>
  String(nom || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

// Les noms des plateformes choisies, d'après la liste proposée ([{ id, name }]). Un identifiant que la liste ne
// connaît plus (plateforme retirée du catalogue de la région) est ignoré.
export function nomsDesPlateformes(ids, proposees) {
  const choisies = new Set(ids.map(Number));
  return new Set((proposees || []).filter((p) => choisies.has(Number(p.id))).map((p) => normaliser(p.name)));
}

// Un titre est « sur mes plateformes » si l'une de ses offres d'**abonnement** y figure (pas la location ni
// l'achat : on ne dit pas qu'on peut regarder gratuitement ce qu'il faut payer à la séance).
export function estSurMesPlateformes(titre, noms) {
  const abonnement = titre?.providers?.flatrate;
  return Array.isArray(abonnement) && abonnement.some((p) => noms.has(normaliser(p.name)));
}

// Un titre dont les offres n'ont jamais été relevées : on ne peut ni l'affirmer ni le contredire.
export const offresInconnues = (titre) => !titre?.providers;

// Garde les titres de `items` qui sont sur mes plateformes. Sans plateforme choisie, rien n'est filtré.
export function filtrerSurMesPlateformes(items, noms) {
  if (!noms || noms.size === 0) return items;
  return items.filter((it) => estSurMesPlateformes(it, noms));
}
