import { useEffect, useState } from 'react';
import Rail from './Rail.jsx';
import HorsLigne from './HorsLigne.jsx';
import { useEnLigne } from '../reseau.js';
import { usePlateformes } from '../usePlateformes.js';
import BarreFiltres from './BarreFiltres.jsx';
import {
  FILTRES_DECOUVERTE_VIDES,
  filtresDecouverteActifs,
  appliquerFiltresDecouverte,
} from '../filtres.js';
import VueRayon from './VueRayon.jsx';
import {
  getMoods,
  discoverMood,
  getRecommendations,
  getAmis,
  getRecommandationsAmis,
  cartesDe,
  garderSurMesPlateformes,
} from '../api.js';

// Onglet « Découvrir » : une succession de rangées d'affiches, façon catalogue.
//   - « Chez tes amis »            ce qu'ils ont aimé et que tu n'as pas ;
//   - « Parce que tu as aimé… »    les recommandations de tes meilleurs titres ;
//   - les sélections               pépites cachées, soirée courte, classiques, l'année ;
//   - les thèmes                   super-héros, braquage, halloween, romance.
// Chaque rangée a son « Tout voir » (la grille complète). Le filtre « Sur mes plateformes »
// restreint les rangées à ce qu'on peut regarder chez soi (choix fait dans Réglages > Mes plateformes).
const keyOf = (item) => `${item.mediaType}-${item.id}`;
const NB_COMME = 2; // rangées « Parce que tu as aimé » : les deux meilleurs titres

const filtrer = (liste, media) => (media === 'all' ? liste : liste.filter((r) => r.mediaType === media));

// Les titres d'un rayon. `page` ne sert qu'aux rayons TMDB paginés (sélections, thèmes).
// `plateformes` : identifiants des plateformes choisies ; `noms` : leurs noms. TMDB filtre lui-même les rayons
// de thèmes et de sélections ; pour « Chez tes amis » et « Comme … », on relève les offres des titres.
async function titresDe(rayon, { media = 'all', page = 1, plateformes = [], noms = null } = {}) {
  if (rayon.type === 'amis') {
    const refs = await getRecommandationsAmis();
    const cartes = await cartesDe(filtrer(refs, media).slice(0, 60));
    const parCle = new Map(refs.map((r) => [keyOf(r), r.amis]));
    const liste = cartes.map((c) => ({ ...c, amis: parCle.get(keyOf(c)) }));
    return noms ? garderSurMesPlateformes(liste, noms) : liste;
  }
  if (rayon.type === 'comme') {
    const liste = filtrer(await getRecommendations(rayon.mediaType, rayon.tmdbId), media);
    return noms ? garderSurMesPlateformes(liste, noms) : liste;
  }
  return discoverMood({
    mood: rayon.key,
    movie: media !== 'tv',
    tv: media !== 'movie',
    page,
    plateformes,
  });
}

const legendeAmis = (item) =>
  item.amis
    ? item.amis
        .slice(0, 2)
        .map((a) => (a.rating ? `${a.pseudo} ★${a.rating}` : a.pseudo))
        .join(' · ') + (item.amis.length > 2 ? ` +${item.amis.length - 2}` : '')
    : null;

export default function Decouvrir({
  items,
  suivi,
  dejaChezMoi,
  cardProps,
  resetKey,
  onSurcouche,
  filtres, // l'état des filtres, gardé par l'application (il survit au changement d'onglet)
  onFiltres,
  genres = [], // [{ key, name }]
  onOpenPlateformes, // ouvre Réglages > Mes plateformes
}) {
  const enLigne = useEnLigne();
  const [essai, setEssai] = useState(0); // « Réessayer » : on remonte les rangées
  const [moods, setMoods] = useState([]);
  const [nbAmis, setNbAmis] = useState(0);
  const [ouvert, setOuvert] = useState(null); // rayon affiché en grille

  // La grille d'un rayon est une surcouche : le bouton retour d'Android la ferme avant de changer d'onglet.
  useEffect(() => {
    if (!ouvert) return undefined;
    onSurcouche?.({ fermer: () => setOuvert(null) });
    return () => onSurcouche?.(null);
  }, [ouvert]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    getMoods().then(setMoods).catch(() => {});
    getAmis().then((a) => setNbAmis(a.length)).catch(() => {});
  }, [resetKey]);

  // Les titres qu'on a le plus aimés : les mieux notés d'abord, puis ceux vus.
  // Figées à l'ouverture de l'écran : sinon marquer un titre « vu » ou le noter depuis une rangée
  // fait apparaître, disparaître ou remplacer des rangées « Comme … » sous les doigts. Elles se
  // recalculent à la prochaine ouverture de l'onglet (l'écran est recréé à chaque changement d'onglet).
  const [sources] = useState(() =>
    items
      .filter((i) => (i.rating ?? 0) >= 4 || i.status === 'vu')
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .slice(0, NB_COMME)
  );

  // Chaque rayon a une clé unique (`cle`) ; le reste dépend de son type.
  const rayons = [
    nbAmis > 0 && {
      cle: 'amis',
      type: 'amis',
      titre: 'Chez tes amis',
      sous: 'Ce qu’ils ont aimé et que tu n’as pas vu',
    },
    ...sources.map((s) => ({
      cle: `comme:${keyOf(s)}`,
      type: 'comme',
      mediaType: s.mediaType,
      tmdbId: s.id,
      titre: `Comme ${s.title}`,
      sous: 'Parce que tu as aimé ce titre',
    })),
    // Les sélections (note, durée, époque) d'abord, puis les thèmes.
    ...moods.filter((m) => m.groupe === 'selection'),
    ...moods.filter((m) => m.groupe !== 'selection'),
  ]
    .filter(Boolean)
    .map((r) => (r.type ? r : { cle: r.key, type: 'mood', key: r.key, titre: r.name }));

  // « Sur mes plateformes » : le choix se fait une fois, dans Réglages > Mes plateformes (relu à chaque
  // affichage). Actif seulement si l'interrupteur est allumé ET qu'au moins une plateforme est choisie.
  const { ids: mesPlateformes, noms: nomsPlateformes, cle: clePlateformes } = usePlateformes();
  const plateformeActive = !!filtres.surMesPlateformes && mesPlateformes.length > 0;
  const idsPlateformes = plateformeActive ? mesPlateformes : [];
  const nomsActifs = plateformeActive && nomsPlateformes.size > 0 ? nomsPlateformes : null;
  const cleChargement = `${filtres.media}|${idsPlateformes.join(',')}|${nomsActifs ? clePlateformes : ''}`;

  const appliquer = (liste) => appliquerFiltresDecouverte(liste, filtres);
  const commun = { suivi, dejaChezMoi, cardProps };
  const barre = {
    vides: FILTRES_DECOUVERTE_VIDES,
    actifs: filtresDecouverteActifs,
    genres,
    surMesPlateformes: { nbChoisies: mesPlateformes.length, masques: 0, onChoisir: onOpenPlateformes },
  };

  return (
    <>
      <header className="page-head">
        <h2>Découvrir</h2>
        <p>Des idées pour ta prochaine soirée, choisies pour toi.</p>
      </header>

      <BarreFiltres filtres={filtres} onChange={onFiltres} {...barre} />

      {!enLigne && (
        <HorsLigne onRetry={() => setEssai((n) => n + 1)} />
      )}

      {enLigne && rayons.map((r) => (
        <Rail
          key={`${r.cle}:${essai}`}
          titre={r.titre}
          sous={r.sous}
          deps={[cleChargement, resetKey]}
          charger={() =>
            titresDe(r, { media: filtres.media, plateformes: r.type === 'mood' ? idsPlateformes : [], noms: nomsActifs })
          }
          appliquer={appliquer}
          onToutVoir={() => setOuvert(r)}
          legende={r.type === 'amis' ? legendeAmis : undefined}
          {...commun}
        />
      ))}

      {enLigne && rayons.length === 0 && <div className="skeleton skeleton--bloc" aria-hidden="true" />}

      {ouvert && (
        <VueRayon
          titre={ouvert.titre}
          sous={ouvert.sous}
          pagine={ouvert.type === 'mood'}
          filtres={filtres}
          onFiltres={onFiltres}
          barre={barre}
          appliquer={appliquer}
          lot={(media, page) =>
            titresDe(ouvert, {
              media,
              page,
              plateformes: ouvert.type === 'mood' ? idsPlateformes : [],
              noms: nomsActifs,
            })
          }
          legende={ouvert.type === 'amis' ? legendeAmis : undefined}
          onClose={() => setOuvert(null)}
          {...commun}
        />
      )}
    </>
  );
}
