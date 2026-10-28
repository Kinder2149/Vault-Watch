import {
  PERIODES,
  TRIS,
  FILTRES_VIDES,
  filtresActifs,
  NOTES_BIBLIO,
} from '../filtres.js';

// Panneau de filtres : période, genre, tri et, selon l'écran, filtre de note (« Mes listes »). La puce
// « Sur mes plateformes » est dans la rangée d'outils de l'écran (voir PlateformesChip). Il ne garde
// aucun état : tout vit chez le parent, qui refait la liste quand les filtres
// changent.
//
// Par défaut il sert la recherche. « Mes listes » lui passe ses propres tris,
// son propre état de départ et le filtre de note.
export default function Filtres({
  filtres,
  onChange,
  tris = TRIS,
  avecNote = false, // filtre « Ma note » (Mes listes)
  genres = null, // [{ key, name }] : filtre par genre (Mes listes)
  vides = FILTRES_VIDES,
  actifs = filtresActifs,
  avecTri = true, // « Trier par » : Mes listes a le sien dans sa rangée d'outils
}) {
  const maj = (patch) => onChange({ ...filtres, ...patch });

  return (
    <div className="filtres" role="group" aria-label="Filtres">
      <div className="filtres__groupe">
        <span className="filtres__label">Année</span>
        <div className="filtres__chips">
          {PERIODES.map((p) => (
            <button
              key={p.key}
              className={`chip ${filtres.periode === p.key ? 'on' : ''}`}
              aria-pressed={filtres.periode === p.key}
              onClick={() => maj({ periode: filtres.periode === p.key ? null : p.key })}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {genres && genres.length > 0 && (
        <div className="filtres__groupe">
          <span className="filtres__label">Genre</span>
          <div className="filtres__chips filtres__chips--defile">
            {genres.map((g) => (
              <button
                key={g.key}
                className={`chip ${filtres.genre === g.key ? 'on' : ''}`}
                aria-pressed={filtres.genre === g.key}
                onClick={() => maj({ genre: filtres.genre === g.key ? null : g.key })}
              >
                {g.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {avecNote && (
        <div className="filtres__groupe">
          <span className="filtres__label">Ma note</span>
          <div className="filtres__chips">
            {NOTES_BIBLIO.map((n) => (
              <button
                key={n.key}
                className={`chip ${filtres.note === n.key ? 'on' : ''}`}
                aria-pressed={filtres.note === n.key}
                onClick={() => maj({ note: filtres.note === n.key ? null : n.key })}
              >
                {n.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {avecTri && (
      <div className="filtres__groupe">
        <span className="filtres__label">Trier par</span>
        <div className="filtres__chips">
          {tris.map((t) => (
            <button
              key={t.key}
              className={`chip ${filtres.tri === t.key ? 'on' : ''}`}
              aria-pressed={filtres.tri === t.key}
              onClick={() => maj({ tri: t.key })}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      )}

      {actifs(filtres) && (
        <button className="btn btn--ghost filtres__reset" onClick={() => onChange(vides)}>
          Réinitialiser
        </button>
      )}
    </div>
  );
}
