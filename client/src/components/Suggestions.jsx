import { useEffect, useState } from 'react';
import MovieCard from './MovieCard.jsx';
import Icon from './Icon.jsx';
import Vide from './Vide.jsx';
import HorsLigne from './HorsLigne.jsx';
import { GrilleFantome } from './Fantomes.jsx';
import BarreFiltres from './BarreFiltres.jsx';
import { appliquerFiltresDecouverte } from '../filtres.js';
import { useEnLigne } from '../reseau.js';
import { garderSurMesPlateformes } from '../api.js';
import { usePlateformes } from '../usePlateformes.js';

// Section « Parce que tu as aimé… » : recommandations TMDB agrégées depuis
// les titres marqués vus / en cours du profil. Affichée à l'intérieur de
// « Ce soir » (embedded), plus d'onglet dédié.
export default function Suggestions({
  items,
  suggestions,
  suggestionsLoading,
  onRefreshSuggestions,
  cardProps,
  embedded = false,
  filtres, // le panneau « Ce soir » (partagé avec l'onglet Suggestion) ; sans lui, pas de filtre
  onFiltres,
  barre,
}) {
  const byKey = new Map(items.map((i) => [`${i.mediaType}-${i.id}`, i]));

  // Films et séries mélangés dans une seule grille : le tirage les alterne déjà.
  // Les filtres s'appliquent à l'affichage, sur ce qui est déjà calculé : aucun nouvel appel.
  const enLigne = useEnLigne();
  const tout = suggestions;

  // « Sur mes plateformes » : TMDB ne filtre pas ces suggestions, on relève les offres de chaque titre
  // (quelques dizaines, mémorisées). `gardes` : les clés retenues, `null` tant que le relevé est en cours.
  const { noms, cle: clePlateformes } = usePlateformes();
  const surPlateformes = !!filtres?.surMesPlateformes && noms.size > 0;
  const [gardes, setGardes] = useState(null);
  useEffect(() => {
    if (!surPlateformes || tout.length === 0) return undefined;
    let courant = true;
    setGardes(null);
    garderSurMesPlateformes(tout, noms).then((l) => courant && setGardes(new Set(l.map((r) => `${r.mediaType}-${r.id}`))));
    return () => {
      courant = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surPlateformes, tout, clePlateformes]);
  const enReleve = surPlateformes && tout.length > 0 && gardes === null;

  const deLaSelection = surPlateformes && gardes ? tout.filter((r) => gardes.has(`${r.mediaType}-${r.id}`)) : tout;
  suggestions = filtres ? appliquerFiltresDecouverte(deLaSelection, filtres) : deLaSelection;
  const body = suggestionsLoading || enReleve ? (
    <GrilleFantome />
  ) : tout.length === 0 && !enLigne ? (
    <HorsLigne onRetry={onRefreshSuggestions} />
  ) : tout.length > 0 && suggestions.length === 0 ? (
    <Vide
      icone="star"
      titre="Aucun titre ne correspond"
      texte="Tes filtres écartent toutes les suggestions du moment."
      action={{ label: 'Réinitialiser', onClick: () => onFiltres(barre.vides) }}
    />
  ) : suggestions.length === 0 ? (
    <Vide
      icone="star"
      titre="Pas encore de suggestion"
      texte="Marque des titres comme vus ou en cours, et note-les : les idées viendront de là."
    />
  ) : (
    <div className="grid">
      {suggestions.map((item, i) => {
        const key = `${item.mediaType}-${item.id}`;
        const followed = byKey.get(key);
        return (
          <div
            className="rail__item rise"
            key={key}
            style={{ animationDelay: `${Math.min(i % 12, 8) * 30}ms` }}
          >
            <MovieCard item={item} isFollowed={!!followed} status={followed?.status} afficheDispo {...cardProps} />
          </div>
        );
      })}
    </div>
  );

  const actualiser = (enBas) => (
    <button
      className="btn btn--ghost tonight__refresh"
      onClick={() => {
        // Depuis le pied de liste, on remonte : la nouvelle liste commence en haut.
        if (enBas) window.scrollTo({ top: 0, behavior: 'smooth' });
        onRefreshSuggestions();
      }}
      disabled={suggestionsLoading}
    >
      <Icon name="refresh" size={14} />
      Actualiser
    </button>
  );

  return (
    <section className={embedded ? 'tonight__section' : 'tonight'}>
      <header className="sec__head">
        <div className="sec__txt">
          <h3 className="sec__title">Parce que tu as aimé…</h3>
          <p className="sec__sub">Choisis d'après ce que tu as vu et noté</p>
        </div>
        {actualiser(false)}
      </header>
      {filtres && <BarreFiltres filtres={filtres} onChange={onFiltres} {...barre} />}
      {body}
      {/* Même bouton en pied de liste : on n'a pas à remonter pour relancer. */}
      {!suggestionsLoading && !enReleve && suggestions.length > 0 && (
        <div className="suggestions__foot">{actualiser(true)}</div>
      )}
    </section>
  );
}
