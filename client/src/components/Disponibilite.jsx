import Icon from './Icon.jsx';

// Pastille de disponibilité d'un titre : où il en est, d'un coup d'œil (voir `etatDisponibilite`).
// Une icône ET un texte, jamais la couleur seule. Les logos des plateformes accompagnent
// « Disponible » et « En location / achat ».
const ICONES = {
  a_venir: 'calendar',
  au_cinema: 'ticket',
  disponible: 'play',
  location_achat: 'tag',
  sorti_sans_streaming: 'info',
};

export default function Disponibilite({ etat }) {
  if (!etat) return null;
  const logos = etat.plateformes.filter((p) => p.logoUrl).slice(0, 5);
  return (
    <div className={`dispo dispo--${etat.etat}`} role="status" data-etat={etat.etat}>
      <span className="dispo__pastille">
        <Icon name={ICONES[etat.etat]} size={15} />
        {etat.libelle}
      </span>
      {etat.detail && <span className="dispo__detail">{etat.detail}</span>}
      {logos.length > 0 && (
        <span className="dispo__logos">
          {logos.map((p) => (
            <img key={p.name} src={p.logoUrl} alt={p.name} title={p.name} width="26" height="26" loading="lazy" />
          ))}
        </span>
      )}
    </div>
  );
}
