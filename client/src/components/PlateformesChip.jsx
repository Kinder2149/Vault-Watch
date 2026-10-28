import Icon from './Icon.jsx';

// « Sur mes plateformes » : la puce qui sert d'interrupteur, posée dans la rangée d'outils de l'écran
// (visible sans ouvrir « Filtres »), et la ligne qui explique ce que le filtre fait quand il a un défaut.
// Les deux lisent le même état : `filtres.surMesPlateformes`.
// La note prend `info` : { nbChoisies, masques, onChoisir } — voir BarreFiltres.
export function PlateformesChip({ filtres, onChange }) {
  const actif = !!filtres.surMesPlateformes;
  return (
    <button
      className={`chip chip--plateformes ${actif ? 'on' : ''}`}
      aria-pressed={actif}
      onClick={() => onChange({ ...filtres, surMesPlateformes: !actif })}
    >
      <Icon name="play" size={12} />
      Sur mes plateformes
    </button>
  );
}

export function PlateformesNote({ filtres, info }) {
  if (!filtres.surMesPlateformes) return null;
  if (info.nbChoisies === 0) {
    return (
      <p className="hint hint--small plateformes-note">
        Aucune plateforme choisie : le filtre ne retire rien.{' '}
        <button className="lien" onClick={info.onChoisir}>
          Choisir mes plateformes
        </button>
      </p>
    );
  }
  if (info.masques > 0) {
    return (
      <p className="hint hint--small plateformes-note">
        {info.masques === 1
          ? '1 titre dont on ne connaît pas encore les offres est masqué.'
          : `${info.masques} titres dont on ne connaît pas encore les offres sont masqués.`}
      </p>
    );
  }
  return null;
}
