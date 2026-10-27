import { useState } from 'react';
import Filtres from './Filtres.jsx';
import { TRIS } from '../filtres.js';

// La rangée d'outils commune des écrans qui filtrent : le sélecteur Tout / Films / Séries à gauche, la puce
// « Filtres » à droite (avec un point quand un filtre est actif), et le panneau dessous quand on l'ouvre.
// Elle ne garde que l'état d'ouverture du panneau : les filtres vivent chez le parent.
//
//  - `filtres` / `onChange` : l'état des filtres (voir FILTRES_DECOUVERTE_VIDES dans filtres.js) ;
//  - `vides` / `actifs` : l'état de départ et le test « un filtre est actif » de l'écran ;
//  - `genres` : [{ key, name }] ; `tris` : les tris proposés ;
//  - `surMesPlateformes` : { nbChoisies, masques, onChoisir } ou null (écran qui ne sait pas filtrer par plateforme).
export default function BarreFiltres({
  filtres,
  onChange,
  vides,
  actifs,
  genres = [],
  tris = TRIS,
  surMesPlateformes = null,
  avecType = true,
}) {
  const [ouvert, setOuvert] = useState(false);
  const enCours = actifs(filtres);

  return (
    <div className="barre-filtres">
      <div className="toolbar">
        {avecType ? (
          <div className="seg seg--sm">
            {[
              ['all', 'Tout'],
              ['movie', 'Films'],
              ['tv', 'Séries'],
            ].map(([v, label]) => (
              <button
                key={v}
                className={filtres.media === v ? 'on' : ''}
                onClick={() => onChange({ ...filtres, media: v })}
              >
                {label}
              </button>
            ))}
          </div>
        ) : (
          <span />
        )}
        <button
          className={`chip chip--filtres ${ouvert || enCours ? 'on' : ''}`}
          aria-expanded={ouvert}
          onClick={() => setOuvert((o) => !o)}
        >
          Filtres
          {enCours && <span className="filtres-bar__dot" aria-hidden="true" />}
        </button>
      </div>
      {ouvert && (
        <Filtres
          filtres={filtres}
          onChange={onChange}
          tris={tris}
          genres={genres}
          vides={vides}
          actifs={actifs}
          surMesPlateformes={surMesPlateformes}
        />
      )}
    </div>
  );
}
