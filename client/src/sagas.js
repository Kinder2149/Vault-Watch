// Regroupement des films d'une même saga dans les vues de liste (mission B3). Pur, sans réseau.
//
// Une saga n'est un groupe que si au moins deux films **de la vue** en font partie : un film seul reste
// libre. Dans un groupe, les films sont dans l'ordre de sortie. Le groupe prend la place de son **premier
// membre** dans l'ordre de la vue : le tri choisi par l'utilisateur est respecté.

// TMDB nomme les collections « Star Wars - Saga », « Dune Collection »… : on garde le nom propre.
export function nomDeSaga(nom) {
  const propre = String(nom || '')
    .replace(/\s*[-–—:]\s*(saga|collection|la saga)\s*$/i, '')
    .replace(/\s+(saga|collection)\s*$/i, '')
    .replace(/^(la\s+)?saga\s+/i, '')
    .trim();
  return propre || String(nom || '').trim();
}

// L'en-tête d'un groupe : « Saga Star Wars — 6 titres ».
export function enteteDeSaga(nom, nombre) {
  return `Saga ${nomDeSaga(nom)} — ${nombre} ${nombre > 1 ? 'titres' : 'titre'}`;
}

const parSortie = (a, b) =>
  String(a.releaseDate || '9999').localeCompare(String(b.releaseDate || '9999')) ||
  String(a.title || '').localeCompare(String(b.title || ''), 'fr');

// `films` : les films de la vue, déjà triés. Renvoie des blocs : `{ film }` ou `{ saga: { id, nom, films } }`.
// `actif` faux : tout à plat, comme avant.
export function regrouperSagas(films, { actif = true } = {}) {
  if (!actif) return films.map((film) => ({ film }));

  const membres = new Map(); // sagaId -> films de la vue
  for (const film of films) {
    if (!film.sagaId) continue;
    if (!membres.has(film.sagaId)) membres.set(film.sagaId, []);
    membres.get(film.sagaId).push(film);
  }

  const blocs = [];
  const dejaPlaces = new Set();
  for (const film of films) {
    const groupe = film.sagaId ? membres.get(film.sagaId) : null;
    if (!groupe || groupe.length < 2) {
      blocs.push({ film });
      continue;
    }
    if (dejaPlaces.has(film.sagaId)) continue; // placé à la position de son premier membre
    dejaPlaces.add(film.sagaId);
    blocs.push({
      saga: {
        id: film.sagaId,
        nom: groupe.find((f) => f.sagaNom)?.sagaNom || film.sagaNom || '',
        films: [...groupe].sort(parSortie),
      },
    });
  }
  return blocs;
}
