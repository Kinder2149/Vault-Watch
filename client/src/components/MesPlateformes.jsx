import { useEffect, useState } from 'react';
import Icon from './Icon.jsx';
import HorsLigne from './HorsLigne.jsx';
import { getPlateformes } from '../api.js';
import { lirePlateformes, ecrirePlateformes, memoriserPlateformes } from '../plateformes.js';

// Écran « Mes plateformes » (Réglages) : les services de streaming auxquels on est abonné, choisis une fois.
// Tous les écrans qui filtrent « sur mes plateformes » (Mes listes, Découvrir…) lisent ce choix.
// La liste proposée est celle des plateformes les plus courantes de la région du catalogue.
export default function MesPlateformes({ onClose, onChange }) {
  const [proposees, setProposees] = useState(null); // null = en chargement
  const [erreur, setErreur] = useState(false);
  const [choisies, setChoisies] = useState(lirePlateformes);
  const [essai, setEssai] = useState(0);

  useEffect(() => {
    let annule = false;
    setErreur(false);
    getPlateformes()
      .then((liste) => {
        memoriserPlateformes(liste);
        if (!annule) setProposees(liste);
      })
      .catch(() => !annule && setErreur(true));
    return () => {
      annule = true;
    };
  }, [essai]);

  function bascule(id) {
    const suivantes = choisies.includes(id) ? choisies.filter((p) => p !== id) : [...choisies, id];
    setChoisies(ecrirePlateformes(suivantes));
    onChange?.(suivantes.length);
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <header className="sheet__head">
          <h2>Mes plateformes</h2>
          <button className="sheet__back" onClick={onClose} aria-label="Retour">
            <Icon name="back" size={22} />
          </button>
        </header>

        <div className="detail-pad about">
          <section className="panel">
            <p>
              Coche les services auxquels tu es abonné. Le filtre « Sur mes plateformes » de Mes listes et de
              Découvrir ne garde alors que ce que tu peux regarder chez toi.
            </p>
            <p className="hint hint--small">
              {choisies.length === 0
                ? 'Aucune plateforme choisie : le filtre ne retire rien.'
                : `${choisies.length} ${choisies.length > 1 ? 'plateformes choisies' : 'plateforme choisie'}.`}
            </p>
          </section>

          {erreur && <HorsLigne onRetry={() => setEssai((n) => n + 1)} />}
          {!erreur && !proposees && <div className="skeleton skeleton--bloc" aria-hidden="true" />}

          {proposees && (
            <section className="panel plateformes-liste" role="group" aria-label="Plateformes">
              {proposees.map((p) => {
                const coche = choisies.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`plateformes-liste__ligne ${coche ? 'on' : ''}`}
                    role="checkbox"
                    aria-checked={coche}
                    onClick={() => bascule(p.id)}
                  >
                    {p.logoUrl ? (
                      <img src={p.logoUrl} alt="" width="32" height="32" loading="lazy" />
                    ) : (
                      <span className="plateformes-liste__sans-logo" aria-hidden="true" />
                    )}
                    <span className="plateformes-liste__nom">{p.name}</span>
                    {coche && <Icon name="check" size={18} />}
                  </button>
                );
              })}
            </section>
          )}

          <p className="attn">Disponibilité fournie par JustWatch (via TMDB).</p>
        </div>
      </div>
    </div>
  );
}
