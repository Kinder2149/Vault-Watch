import { createContext, useContext, useEffect, useState } from 'react';
import Icon from './Icon.jsx';
import { ICONES } from './Disponibilite.jsx';
import { getFilmsEnSalle } from '../api.js';
import { etatDisponibilite } from '../status.js';

// Pastille de disponibilité d'une affiche : une ligne, icône + libellé court (voir `etatDisponibilite`).
//
// Une carte n'appelle jamais TMDB : elle lit ce que le suivi a rangé (offres, date de la région)
// et la liste « au cinéma » du jour, lue une fois pour toute l'application. Un titre hors suivi
// (Découvrir) n'a pas d'offres connues : il ne reçoit que les deux affirmations toujours vraies,
// « À venir » (date future) et « Au cinéma ». Jamais « Disponible » ni « Pas en streaming » sans relevé.

// Le suivi (Map « type-id » → ligne), fourni par l'application.
export const DispoContext = createContext(new Map());

const LIBELLES = {
  a_venir: 'À venir',
  au_cinema: 'Au cinéma',
  disponible: 'Disponible',
  location_achat: 'Location / achat',
  sorti_sans_streaming: 'Pas en streaming',
};

// --- Liste « au cinéma » du jour, partagée par toutes les cartes ---
// `undefined` = pas encore lue, `null` = inconnue (réseau). Un échec n'est retenté qu'au bout d'une
// minute : des dizaines de cartes ne doivent pas relancer chacune un appel qui échoue.
const REESSAI_MS = 60_000;
let memoire = null; // { jour, valeur, promesse, echecA }

function chargerSalle() {
  const jour = new Date().toISOString().slice(0, 10);
  const perime = !memoire || memoire.jour !== jour;
  const aReessayer = memoire && memoire.valeur === null && Date.now() - memoire.echecA > REESSAI_MS;
  if (perime || aReessayer) {
    const m = { jour, valeur: undefined, echecA: 0, promesse: null };
    m.promesse = getFilmsEnSalle()
      .catch(() => null)
      .then((valeur) => {
        m.valeur = valeur;
        if (valeur === null) m.echecA = Date.now();
        return valeur;
      });
    memoire = m;
  }
  return memoire;
}

function useFilmsEnSalle() {
  const [valeur, setValeur] = useState(() => chargerSalle().valeur);
  useEffect(() => {
    let annule = false;
    chargerSalle().promesse.then((v) => !annule && setValeur(v));
    return () => {
      annule = true;
    };
  }, []);
  return valeur;
}

export default function PastilleCarte({ item }) {
  const suivi = useContext(DispoContext);
  const enSalle = useFilmsEnSalle();
  const estSerie = item.mediaType === 'tv';
  const ligne = suivi.get(`${item.mediaType}-${item.id}`);

  // Un titre vu ou abandonné n'a plus rien à nous dire sur où le regarder.
  if (ligne && (ligne.status === 'vu' || ligne.status === 'abandonne')) return null;

  const etat = etatDisponibilite({
    isSeries: estSerie,
    id: item.id,
    releaseDate: ligne?.releaseDate ?? item.releaseDate ?? null,
    providers: ligne?.providers ?? null,
    enSalle: estSerie ? null : enSalle ?? null,
  });
  if (!etat) return null;

  const logo = etat.etat === 'disponible' ? etat.plateformes.find((p) => p.logoUrl) : null;
  return (
    <p className={`dispo-mini dispo-mini--${etat.etat}`} data-etat={etat.etat} title={etat.detail || etat.libelle}>
      <Icon name={ICONES[etat.etat]} size={13} />
      <span>{LIBELLES[etat.etat]}</span>
      {logo && <img src={logo.logoUrl} alt={logo.name} width="16" height="16" loading="lazy" />}
    </p>
  );
}
