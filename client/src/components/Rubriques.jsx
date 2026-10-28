import { useState, useEffect, useRef } from 'react';
import Vide from './Vide.jsx';
import HorsLigne from './HorsLigne.jsx';
import { GrilleFantome } from './Fantomes.jsx';
import { estErreurReseau } from '../reseau.js';
import MovieCard from './MovieCard.jsx';
import BarreFiltres from './BarreFiltres.jsx';
import { appliquerFiltresDecouverte } from '../filtres.js';
import { getRubrique } from '../api.js';
import { lirePlateformes } from '../plateformes.js';

// Rubriques TMDB (Tendances, Nouveautés, À venir) : grille paginée, titres déjà
// suivis masqués. Une page TMDB (20 titres), une fois masqué ce qu'on a déjà,
// n'en laissait parfois qu'une poignée : on en charge 3 d'un coup, et « Voir
// plus » en ajoute 3 autres.
//
// Sert deux écrans :
//  - la recherche à vide : une seule rubrique (Tendances), le filtre Films /
//    Séries est celui de la recherche (`mediaFilter` fourni) ;
//  - « Ce soir > Suggestion » : les trois rubriques, avec le panneau de filtres « Ce soir » (`filtres`,
//    `onFiltres`, `barre`) ; sans lui, l'ancien sélecteur Tout / Films / Séries.
const TOUTES = [
  ['tendances', 'Tendances'],
  ['nouveautes', 'Nouveautés'],
  ['avenir', 'À venir'],
];
const keyOf = (item) => `${item.mediaType}-${item.id}`;

export default function Rubriques({
  rubriques = TOUTES,
  mediaFilter: filtreFourni,
  suivi,
  dejaChezMoi,
  cardProps,
  resetKey, // change quand le catalogue change de langue : on recharge
  filtres, // panneau commun (voir BarreFiltres) : type, année, genre, tri
  onFiltres,
  barre,
}) {
  const [rubrique, setRubrique] = useState(rubriques[0][0]);
  const [filtrePropre, setFiltrePropre] = useState('all');
  const mediaFilter = filtreFourni ?? (filtres ? filtres.media : filtrePropre);
  // « Sur mes plateformes » part chez TMDB (discover) : actif si l'interrupteur est allumé ET qu'au moins une
  // plateforme est choisie.
  const choisies = lirePlateformes();
  const plateformes = filtres?.surMesPlateformes ? choisies : [];
  const clePlateformes = plateformes.join(',');

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0); // dernière page chargée
  const [plus, setPlus] = useState(true);
  const [charge, setCharge] = useState(false);
  const [horsLigne, setHorsLigne] = useState(false);
  const seq = useRef(0);

  async function charger(ajouter = false) {
    const moi = ++seq.current;
    setCharge(true);
    const depuis = ajouter ? page + 1 : 1;
    try {
      let echecs = 0;
      let derniereErreur = null;
      const lots = await Promise.all(
        [depuis, depuis + 1, depuis + 2].map((p) =>
          getRubrique({ rubrique, mediaType: mediaFilter, page: p, plateformes }).catch((e) => {
            echecs += 1;
            derniereErreur = e;
            return [];
          })
        )
      );
      if (moi !== seq.current) return; // rubrique/filtre changé entre-temps
      setHorsLigne(echecs === lots.length && estErreurReseau(derniereErreur));
      setPage(depuis + 2);
      setPlus(lots[2].length > 0);
      setItems((prev) => {
        const base = ajouter ? prev : [];
        const vus = new Set(base.map(keyOf));
        return [...base, ...lots.flat().filter((r) => !vus.has(keyOf(r)) && vus.add(keyOf(r)))];
      });
    } catch {
      /* réseau indisponible : la grille reste vide */
    } finally {
      if (moi === seq.current) setCharge(false);
    }
  }

  // Vidé d'abord : on ne montre pas les Tendances sous le titre « Nouveautés »
  // le temps que la réponse arrive.
  useEffect(() => {
    setItems([]);
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rubrique, mediaFilter, resetKey, clePlateformes]);

  const filtrees = filtres
    ? appliquerFiltresDecouverte(items, filtres)
    : mediaFilter === 'all'
      ? items
      : items.filter((r) => r.mediaType === mediaFilter);
  const visibles = filtrees.filter((r) => !dejaChezMoi(r));

  return (
    <>
      {rubriques.length > 1 && (
        <div className="chips-scroll chips-scroll--page" role="group" aria-label="Rubrique">
          {rubriques.map(([v, label]) => (
            <button
              key={v}
              className={`chip ${rubrique === v ? 'on' : ''}`}
              aria-pressed={rubrique === v}
              onClick={() => setRubrique(v)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {filtres && <BarreFiltres filtres={filtres} onChange={onFiltres} {...barre} />}
      {filtreFourni === undefined && !filtres && (
        <div className="seg seg--sm">
          {[
            ['all', 'Tout'],
            ['movie', 'Films'],
            ['tv', 'Séries'],
          ].map(([v, label]) => (
            <button
              key={v}
              className={filtrePropre === v ? 'on' : ''}
              onClick={() => setFiltrePropre(v)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {visibles.length === 0 && charge && <GrilleFantome />}
      {visibles.length === 0 && !charge && horsLigne && <HorsLigne onRetry={() => charger()} />}
      {visibles.length === 0 && !charge && !horsLigne && filtres && items.length > 0 && (
        <Vide
          icone="film"
          titre="Aucun titre ne correspond"
          texte="Tes filtres écartent tout ce qui est chargé : réinitialise-les ou charge-en davantage."
          action={{ label: 'Réinitialiser', onClick: () => onFiltres(barre.vides) }}
        />
      )}
      {visibles.length === 0 && !charge && !horsLigne && !(filtres && items.length > 0) && (
        <Vide icone="film" titre="Rien à afficher pour le moment" texte="Reviens un peu plus tard, ou change de rubrique." />
      )}
      <section className="grid">
        {visibles.map((item) => (
          <MovieCard
            key={keyOf(item)}
            item={item}
            isFollowed={suivi.has(keyOf(item))}
            status={suivi.get(keyOf(item))?.status}
            {...cardProps}
          />
        ))}
      </section>
      {plus && (visibles.length > 0 || (filtres && items.length > 0)) && (
        <div className="voirplus">
          <button className="btn btn--ghost" onClick={() => charger(true)}>
            Voir plus
          </button>
        </div>
      )}
    </>
  );
}
