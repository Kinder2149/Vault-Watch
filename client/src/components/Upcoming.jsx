import MovieCard from './MovieCard.jsx';
import Icon from './Icon.jsx';
import { etatDeTitre, formatReleaseDate } from '../status.js';

// « Pas encore disponible » : les titres « à voir » qu'on ne peut pas regarder ce soir — pas encore
// sortis, au cinéma, ou sortis sans aucune offre (voir `estRegardable`). Chaque affiche dit lequel par sa
// pastille. Une ligne repliée (le compte, combien sont au cinéma, la prochaine sortie) qui se déplie en
// grille. Purement dérivé de ce que le suivi sait : dès qu'un titre devient disponible, il repasse tout
// seul dans « À voir ce soir ».
//
// `items` : déjà filtrés par l'écran parent (les non regardables). `enSalle` : la liste « au cinéma » du jour.
const ORDRE = { au_cinema: 0, a_venir: 1, sorti_sans_streaming: 2 };

export default function Upcoming({ items, enSalle, cardProps, ouvert, onToggle }) {
  const avecEtat = items
    .map((item) => ({ item, etat: etatDeTitre(item, enSalle)?.etat ?? 'sorti_sans_streaming' }))
    .sort(
      (a, b) =>
        (ORDRE[a.etat] ?? 3) - (ORDRE[b.etat] ?? 3) ||
        String(a.item.releaseDate || '9999').localeCompare(String(b.item.releaseDate || '9999'))
    );

  if (avecEtat.length === 0) return null;

  const liste = avecEtat.map((x) => x.item);
  const films = liste.filter((i) => i.mediaType === 'movie');
  const series = liste.filter((i) => i.mediaType === 'tv');
  const auCinema = avecEtat.filter((x) => x.etat === 'au_cinema').length;
  const prochaine = avecEtat.find((x) => x.etat === 'a_venir' && x.item.releaseDate)?.item.releaseDate;
  const etatDe = new Map(avecEtat.map((x) => [`${x.item.mediaType}-${x.item.id}`, x.etat]));

  const grid = (liste) => (
    <div className="grid">
      {liste.map((item) => (
        <div key={`${item.mediaType}-${item.id}`} className="upcoming-item">
          <MovieCard item={item} isFollowed={true} status={item.status} afficheDispo {...cardProps} />
          {etatDe.get(`${item.mediaType}-${item.id}`) === 'a_venir' && item.releaseDate && (
            <p className="upcoming-item__date">Sortie le {formatReleaseDate(item.releaseDate)}</p>
          )}
        </div>
      ))}
    </div>
  );

  const resume = [
    `${liste.length} ${liste.length > 1 ? 'titres' : 'titre'}`,
    auCinema > 0 && `${auCinema} au cinéma`,
    prochaine && `prochaine sortie le ${formatReleaseDate(prochaine)}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <section className="sec">
      <button className="panel panel--ligne" onClick={onToggle} aria-expanded={ouvert}>
        <span className="panel--ligne__ico">
          <Icon name="calendar" size={20} />
        </span>
        <span className="panel--ligne__txt">
          <strong>Pas encore disponible</strong>
          <span>{resume}</span>
        </span>
        <span className={`panel--ligne__fleche ${ouvert ? 'on' : ''}`}>
          <Icon name="chevron" size={18} />
        </span>
      </button>
      {ouvert && (
        <div className="upcoming__corps">
          {films.length > 0 && (
            <div className="media-section">
              <h4 className="subhead">Films</h4>
              {grid(films)}
            </div>
          )}
          {series.length > 0 && (
            <div className="media-section">
              <h4 className="subhead">Séries</h4>
              {grid(series)}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
