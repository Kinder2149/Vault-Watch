import { useEffect, useState } from 'react';
import { getPlateformes } from './api.js';
import {
  lirePlateformes,
  nomsDesPlateformes,
  memoriserPlateformes,
  plateformesMemorisees,
} from './plateformes.js';

// « Mes plateformes » pour un écran : les identifiants choisis (Réglages > Mes plateformes, relus à chaque
// affichage : on revient de Réglages) et leurs noms. La liste des plateformes est gardée sur l'appareil, puis
// rafraîchie : les filtres marchent aussi hors connexion. `cle` change quand le choix change (dépendance d'effet).
export function usePlateformes() {
  const [proposees, setProposees] = useState(plateformesMemorisees);
  useEffect(() => {
    getPlateformes()
      .then((liste) => {
        memoriserPlateformes(liste);
        setProposees(liste);
      })
      .catch(() => {});
  }, []);
  const ids = lirePlateformes();
  const noms = nomsDesPlateformes(ids, proposees);
  return { ids, noms, cle: `${ids.join(',')}|${[...noms].join(',')}` };
}
