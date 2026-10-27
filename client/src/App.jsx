import { useState, useEffect, useRef } from 'react';
import { App as Capacitor } from '@capacitor/app';
import SearchBar from './components/SearchBar.jsx';
import { DispoContext } from './components/PastilleCarte.jsx';
import MovieCard from './components/MovieCard.jsx';
import Detail from './components/Detail.jsx';
import Lists from './components/Lists.jsx';
import Rubriques from './components/Rubriques.jsx';
import Partage from './components/Partage.jsx';
import Amis from './components/Amis.jsx';
import Decouvrir from './components/Decouvrir.jsx';
import Tonight from './components/Tonight.jsx';
import Settings from './components/Settings.jsx';
import StatusMenu from './components/StatusMenu.jsx';
import CatalogLanguage from './components/CatalogLanguage.jsx';
import BarreFiltres from './components/BarreFiltres.jsx';
import Icon from './components/Icon.jsx';
import About from './components/About.jsx';
import Backup from './components/Backup.jsx';
import Notifications from './components/Notifications.jsx';
import MesPlateformes from './components/MesPlateformes.jsx';
import { lirePlateformes } from './plateformes.js';
import Profiles from './components/Profiles.jsx';
import Stats from './components/Stats.jsx';
import Avatar from './components/Avatar.jsx';
import Vide from './components/Vide.jsx';
import HorsLigne from './components/HorsLigne.jsx';
import { GrilleFantome } from './components/Fantomes.jsx';
import { estErreurReseau, useEnLigne } from './reseau.js';
import { vibre } from './tactile.js';
import { lireChoix, appliquer as appliquerTheme } from './theme.js';
import {
  searchTitles,
  searchByActor,
  getActorFilmography,
  getRecommendations,
  getGenres,
  chercherMotsCles,
  discoverMotCle,
  getSuggestions,
  getSuivi,
  addToSuivi,
  removeFromSuivi,
  setStatus as apiSetStatus,
  getProfiles,
  createProfile,
  renameProfile,
  setProfileAvatar,
  countProfileData,
  deleteProfile,
  getActiveProfileId,
  setActiveProfileId,
  hasCatalogLanguage,
  getCatalogLanguage,
  languageLabel,
  chooseInitialLanguage,
  changeCatalogLanguage,
  getListes,
  mettreAJourDatesDeSortie,
  mettreAJourDisponibilite,
  mettreAJourSagas,
  verifierNotifications,
  notifierSortiesDues,
  ecouterClicsNotification,
  createListe as apiCreateListe,
  deleteListe as apiDeleteListe,
  setListePrive as apiSetListePrive,
  getPartage,
  publierPartageAuto,
  partageDisponible,
  addToListe as apiAddToListe,
  removeFromListe as apiRemoveFromListe,
} from './api.js';

import {
  sauvegardeAutomatique,
  surChangementDeSauvegarde,
  demarrerEcouteReseau,
  lireEtatSauvegarde,
  bandeauSauvegarde,
} from './backup.js';

import {
  FILTRES_BIBLIO_VIDES,
  FILTRES_DECOUVERTE_VIDES,
  filtresDecouverteActifs,
  appliquerFiltresDecouverte,
} from './filtres.js';

const keyOf = (item) => `${item.mediaType}-${item.id}`;

export default function App() {
  // 4 destinations, comme la barre de navigation du bas.
  const [view, setView] = useState('search'); // 'search' | 'tonight' | 'lists' | 'settings'
  // Onglets déjà visités, du plus ancien au plus récent (l'onglet affiché n'y
  // est pas). Le bouton retour d'Android dépile cette liste ; « Recherche »
  // est la racine : quand la pile est vide, le retour quitte l'application.
  const [tabStack, setTabStack] = useState([]);
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [searchMode, setSearchMode] = useState('title'); // title | actor | keyword
  const [person, setPerson] = useState(null); // acteur résolu (mode acteur)
  const derniereRecherche = useRef('');
  const [erreurReseau, setErreurReseau] = useState(false);
  const [genres, setGenres] = useState([]); // [{ key, name }] — liste unique films + séries
  // Mot-clé : propositions pour la saisie, mot-clé ouvert, page chargée et suite disponible.
  const [motsCles, setMotsCles] = useState([]); // [{ id, name }]
  const [motCle, setMotCle] = useState(null);
  const [motClePage, setMotClePage] = useState(1);
  const [motCleMore, setMotCleMore] = useState(true);
  // Recherche par titre : page chargée et suite disponible (« Voir plus »).
  const [titrePage, setTitrePage] = useState(1);
  const [titreMore, setTitreMore] = useState(false);
  const searchSeq = useRef(0);
  // Fiche d'où l'on est parti en touchant un acteur, et l'onglet où elle était
  // ouverte : le retour (bouton ou geste Android) la rouvre. Effacée dès qu'on
  // fait autre chose (nouvel onglet, nouvelle recherche).
  const [ficheOrigine, setFicheOrigine] = useState(null); // { item, view }
  // La barre de recherche lance une recherche *vide* dès qu'elle change de mode
  // ou se recrée, ce qui viderait la filmographie qu'on vient d'afficher. Tant
  // que cette filmographie est à l'écran, on ignore cette recherche vide ; la
  // barre est recréée (`barreCle`) pour ne pas rejouer un ancien texte tapé.
  const acteurParFiche = useRef(false);
  const [barreCle, setBarreCle] = useState(0);
  // Filtres de la recherche : le panneau commun (type, année, genre, tri ; plateformes pour un mot-clé).
  // Remis à zéro à chaque changement de mode.
  const [filtresRecherche, setFiltresRecherche] = useState(FILTRES_DECOUVERTE_VIDES);
  // Suivi complet : clé -> item (avec status et listStatus).
  const [suivi, setSuivi] = useState(() => new Map());
  const [openDetail, setOpenDetail] = useState(null);
  // Titre dont le menu de statuts (appui long) est ouvert.
  const [statusMenu, setStatusMenu] = useState(null);
  const [showAbout, setShowAbout] = useState(false);
  const [showBackup, setShowBackup] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showPlateformes, setShowPlateformes] = useState(false);
  const [, setNbPlateformes] = useState(0); // sert à relancer l'affichage quand le choix change
  const [showProfiles, setShowProfiles] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showPartage, setShowPartage] = useState(false);
  const [showAmis, setShowAmis] = useState(false);
  // Profil partagé (amis par code) du profil actif, ou null s'il n'est pas activé.
  const [partage, setPartage] = useState(null);
  const rafraichirPartage = () => getPartage().then(setPartage).catch(() => setPartage(null));
  // Écran ouvert par-dessus un onglet (ex. « Ajouter des titres » dans une
  // liste) : il possède son propre état, mais c'est ici qu'on sait dans quel
  // ordre le bouton retour doit fermer les choses.
  const [surcouche, setSurcouche] = useState(null);
  // Rappel de sauvegarde cloud. Google réaffichant son écran de compte à
  // chaque autorisation, une sauvegarde ne peut pas partir sans un geste :
  // on le demande une fois, au lancement, plutôt que d'interrompre en pleine
  // utilisation. Écarté d'un geste, il ne revient pas de la session.
  // Bandeau de sauvegarde : seulement quand quelque chose est bloqué (voir `bandeauSauvegarde`).
  // `versionSauvegarde` relance le calcul à chaque changement de la sauvegarde ; `rappelMasque`
  // retient la cause qu'on a fermée avec la croix (le bandeau revient si la cause change).
  const [versionSauvegarde, setVersionSauvegarde] = useState(0);
  const [rappelMasque, setRappelMasque] = useState(null);
  const enLigne = useEnLigne();
  // Langue du catalogue : tant qu'elle n'a jamais été choisie, l'écran de
  // bienvenue s'affiche avant tout le reste.
  const [needLanguage, setNeedLanguage] = useState(() => !hasCatalogLanguage());
  const [catalogLang, setCatalogLang] = useState(() => getCatalogLanguage());
  const [showLanguage, setShowLanguage] = useState(false);
  // Profils : la liste et l'id actif. Tant qu'aucun profil n'est prêt, on ne
  // lance aucune opération de suivi (elles sont toujours scopées par profil).
  const [profiles, setProfiles] = useState([]);
  const [activeProfile, setActiveProfile] = useState(getActiveProfileId());
  // Thème : Automatique / Clair / Sombre (posé sur <html> par main.jsx au démarrage).
  const [choixTheme, setChoixTheme] = useState(lireChoix);

  function changerTheme(choix) {
    setChoixTheme(choix);
    appliquerTheme(choix);
  }

  const [listes, setListes] = useState([]);
  // Tri et filtres de « Mes listes » : gardés par l'application le temps de la
  // séance (on les retrouve en changeant de statut, de liste ou d'onglet),
  // jamais enregistrés d'une session à l'autre.
  const [filtresListes, setFiltresListes] = useState(FILTRES_BIBLIO_VIDES);
  // Filtres de Découvrir : gardés ici pour survivre au changement d'onglet (l'écran est recréé à chaque fois).
  const [filtresDecouverte, setFiltresDecouverte] = useState(FILTRES_DECOUVERTE_VIDES);
  const [filtresSoir, setFiltresSoir] = useState(FILTRES_DECOUVERTE_VIDES); // Ce soir : Découverte et Suggestion
  // Sous-onglet actif de « Ce soir ». Mémorisé tant que l'application tourne
  // (on retrouve son sous-onglet en revenant depuis un autre onglet), mais
  // jamais enregistré : à la réouverture on repart toujours d'« En attente ».
  const [tonightTab, setTonightTab] = useState('attente');
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  const suiviRef = useRef(new Map());
  suiviRef.current = suivi;

  function loadSuivi() {
    getSuivi()
      .then((items) => setSuivi(new Map(items.map((i) => [keyOf(i), i]))))
      .catch(() => {});
  }

  function loadListes() {
    getListes().then(setListes).catch(() => {});
  }

  function loadSuggestions() {
    setSuggestionsLoading(true);
    getSuggestions()
      .then(setSuggestions)
      .catch(() => setSuggestions([]))
      .finally(() => setSuggestionsLoading(false));
  }

  // Au démarrage : charger les profils et fixer le profil actif.
  // Si l'id mémorisé (localStorage) n'existe plus, on prend le premier profil.
  useEffect(() => {
    getProfiles()
      .then((list) => {
        setProfiles(list);
        const stored = getActiveProfileId();
        const chosen = list.find((p) => p.id === stored) || list[0];
        if (chosen) {
          setActiveProfileId(chosen.id);
          setActiveProfile(chosen.id);
        }
      })
      .catch((e) => setError(e.message));
  }, []);

  // Recharger le suivi dès qu'un profil actif est disponible / change.
  useEffect(() => {
    if (activeProfile) {
      loadSuivi();
      loadListes();
    }
  }, [activeProfile]);

  // Rattrapage silencieux, une fois par lancement. Deux cas :
  //   - les fiches d'avant que l'application ne retienne la date de sortie,
  //     qui n'en avaient aucune (sans date, un film à venir passe pour sorti) ;
  //   - celles dont la date vient d'un autre pays que la langue choisie.
  // On complète, puis on recharge — sinon l'écran garderait l'ancienne liste.
  // En cas de coupure réseau, on ne dit rien : ce sera retenté au prochain
  // lancement, et l'application marche exactement comme avant en attendant.
  //
  // Puis, à la suite, le relevé de disponibilité (offres de streaming, saga) des titres encore à
  // regarder : au plus 60 par lancement, renouvelé après 7 jours, silencieux hors connexion.
  useEffect(() => {
    if (!activeProfile) return;
    mettreAJourDatesDeSortie()
      .then((completees) => {
        if (completees > 0) loadSuivi();
      })
      .catch(() => {})
      .then(() => releverDisponibilite())
      .then(() => mettreAJourSagas())
      .then((releves) => {
        if (releves > 0) loadSuivi(); // les groupes de sagas apparaissent dans les listes
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfile]);

  // Relevé de disponibilité, puis rechargement du suivi si quelque chose a bougé : c'est ce qui fait
  // apparaître la pastille d'un titre qu'on vient d'ajouter, sans relancer l'application.
  function releverDisponibilite() {
    return mettreAJourDisponibilite()
      .then((releves) => {
        if (releves > 0) loadSuivi();
      })
      .catch(() => {});
  }

  // Cycle de vérification des notifications de sortie (figé le 2026-09-27) :
  // ne revérifie que les titres suivis « en attente » d'une date, au plus une
  // fois par jour — sinon rester l'application ouverte redemanderait les mêmes
  // fiches à TMDB sans arrêt. La date du dernier passage est gardée par
  // profil, hors base : ce n'est pas une donnée de suivi, juste un repère
  // local à l'appareil.
  // Une fois le cycle passé (ou déjà fait aujourd'hui), on regarde — à chaque
  // lancement, sans condition de date : une lecture locale, sans appel réseau,
  // rien ne justifie de l'espacer — si des titres sont désormais dus, et on
  // les notifie. C'est ce dernier pas qui envoie la vraie notification.
  useEffect(() => {
    if (!activeProfile) return;
    const cle = `notif-cycle:${activeProfile}`;
    const aujourdhui = new Date().toISOString().slice(0, 10);
    const cycle =
      localStorage.getItem(cle) === aujourdhui
        ? Promise.resolve()
        : verifierNotifications()
            .then(() => localStorage.setItem(cle, aujourdhui))
            .catch(() => {});
    cycle.then(() => notifierSortiesDues()).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfile]);

  // Un clic sur une notification de sortie ouvre la fiche du titre notifié.
  // Branché une fois le profil actif (la fiche en dépend), ce qui couvre aussi
  // le lancement à froid : le clic en attente est livré à l'enregistrement.
  useEffect(() => {
    if (!activeProfile) return undefined;
    return ecouterClicsNotification((titre) => {
      setShowNotifications(false);
      // Le titre notifié est suivi : on reprend sa fiche complète si elle est chargée.
      const connu = suiviRef.current.get(keyOf(titre));
      setOpenDetail(connu || { id: titre.id, mediaType: titre.mediaType, title: titre.title });
    });
  }, [activeProfile]);

  // Genres chargés une fois (indépendants du profil).
  useEffect(() => {
    getGenres().then(setGenres).catch(() => {});
  }, []);

  // Mot-clé : les titres se rechargent quand on ouvre un mot-clé, et quand le type (Films / Séries)
  // ou « Sur mes plateformes » change : ces deux réglages partent chez TMDB.
  useEffect(() => {
    if (searchMode !== 'keyword' || !motCle) return;
    runMotCle(motCle, 1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motCle, filtresRecherche.media, filtresRecherche.surMesPlateformes, searchMode]);

  function handleSelectProfile(id) {
    setActiveProfileId(id);
    setActiveProfile(id);
    setOpenDetail(null); // la fiche ouverte appartenait à l'ancien profil
  }

  async function handleCreateProfile(name) {
    try {
      const created = await createProfile(name);
      setProfiles((prev) => [...prev, created]);
      handleSelectProfile(created.id);
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleRenameProfile(id, name) {
    try {
      await renameProfile(id, name);
      setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleSetProfileAvatar(id, avatar) {
    try {
      await setProfileAvatar(id, avatar);
      setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, avatar } : p)));
    } catch (e) {
      setError(e.message);
    }
  }

  // Supprimer un profil : la base rend l'id du profil sur lequel se rabattre.
  // Si c'était le profil affiché, on bascule dessus — sinon l'écran resterait
  // branché sur des données qui n'existent plus.
  async function handleDeleteProfile(id) {
    const repli = await deleteProfile(id);
    const restants = await getProfiles();
    setProfiles(restants);
    if (id === activeProfile) handleSelectProfile(repli);
  }

  // Après restauration d'une sauvegarde : le profil restauré devient l'actif et
  // tout ce qui est affiché est rechargé depuis la base (le contenu a changé).
  async function handleRestored(id) {
    try {
      setProfiles(await getProfiles());
      handleSelectProfile(id);
      await loadSuivi();
      loadListes();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleSearch(query) {
    if (!query && acteurParFiche.current) return;
    acteurParFiche.current = false;
    const seq = ++searchSeq.current;
    setFicheOrigine(null);
    if (!query) {
      setResults([]);
      setMotsCles([]);
      setMotCle(null);
      setPerson(null);
      setStatus('idle');
      setHasSearched(false);
      return;
    }
    derniereRecherche.current = query;
    setStatus('loading');
    setError('');
    setErreurReseau(false);
    setHasSearched(true);
    try {
      if (searchMode === 'keyword') {
        const trouves = await chercherMotsCles(query);
        if (seq === searchSeq.current) {
          setPerson(null);
          setResults([]);
          setMotsCles(trouves);
          // Un seul mot-clé possible : on l'ouvre directement.
          setMotCle(trouves.length === 1 ? trouves[0] : null);
          setStatus('done');
        }
      } else if (searchMode === 'actor') {
        const { person: found, results: credits } = await searchByActor(query);
        if (seq === searchSeq.current) {
          setPerson(found);
          setResults(credits);
          setStatus('done');
        }
      } else {
        const { items: found, totalPages } = await searchTitles(query, 1);
        if (seq === searchSeq.current) {
          setPerson(null);
          setResults(found);
          setTitrePage(1);
          setTitreMore(totalPages > 1);
          setStatus('done');
        }
      }
    } catch (err) {
      // On ignore les réponses dépassées (frappe rapide).
      if (seq === searchSeq.current) {
        setError(err.message);
        setErreurReseau(estErreurReseau(err));
        setStatus('error');
      }
    }
  }

  // « Voir plus » de la recherche par titre : page suivante, sans doublon.
  async function chargerPlusTitres() {
    const seq = searchSeq.current;
    try {
      const { items, totalPages } = await searchTitles(derniereRecherche.current, titrePage + 1);
      if (seq !== searchSeq.current) return;
      setResults((prev) => {
        const deja = new Set(prev.map(keyOf));
        return [...prev, ...items.filter((r) => !deja.has(keyOf(r)))];
      });
      setTitrePage(titrePage + 1);
      setTitreMore(titrePage + 1 < totalPages);
    } catch (err) {
      setError(err.message);
    }
  }

  // Touche un acteur dans une fiche : on ferme la fiche et on affiche sa
  // filmographie dans l'onglet Recherche, en mode acteur.
  async function handleOpenActor(actor) {
    const seq = ++searchSeq.current;
    acteurParFiche.current = true;
    setBarreCle((n) => n + 1);
    setFicheOrigine({ item: openDetail, view });
    setOpenDetail(null);
    showTab('search');
    setFiltresRecherche(FILTRES_DECOUVERTE_VIDES);
    setSearchMode('actor');
    setMotCle(null);
    setMotsCles([]);
    setResults([]);
    setPerson(null);
    setError('');
    setHasSearched(true);
    setStatus('loading');
    try {
      const { person: found, results: credits } = await getActorFilmography(actor.id);
      if (seq === searchSeq.current) {
        setPerson(found);
        setResults(credits);
        setStatus('done');
      }
    } catch (err) {
      if (seq === searchSeq.current) {
        setError(err.message);
        setStatus('error');
      }
    }
  }

  // Rouvre la fiche d'où l'on venait, dans l'onglet où elle était.
  function retourFiche() {
    const origine = ficheOrigine;
    acteurParFiche.current = false;
    setFicheOrigine(null);
    if (!origine) return;
    showTab(origine.view);
    setOpenDetail(origine.item);
  }

  // Change de mode de recherche en repartant d'un état propre.
  function changeMode(mode) {
    acteurParFiche.current = false;
    setFicheOrigine(null);
    // Les filtres d'un mode ne suivent pas dans l'autre : leur effet n'est pas le même.
    setFiltresRecherche(FILTRES_DECOUVERTE_VIDES);
    setSearchMode(mode);
    setMotCle(null);
    setMotsCles([]);
    setPerson(null);
    setResults([]);
    setHasSearched(false);
    setStatus('idle');
  }

  // Les titres d'un mot-clé. Les titres déjà suivis sont masqués à l'affichage : une page TMDB peut
  // n'en laisser que quelques-uns. On enchaîne donc les pages jusqu'à avoir de quoi remplir l'écran
  // (12 nouveaux), 4 pages au plus par appui. Le type et les plateformes partent chez TMDB.
  async function runMotCle(mot, page = 1, append = false) {
    const seq = ++searchSeq.current;
    setError('');
    setErreurReseau(false);
    const { media, surMesPlateformes } = filtresRecherche;
    const params = {
      keyword: mot.id,
      movie: media !== 'tv',
      tv: media !== 'movie',
      plateformes: surMesPlateformes ? lirePlateformes() : [],
    };
    if (!append) setStatus('loading');
    try {
      const found = [];
      let p = page;
      let more = true;
      for (let essais = 1; ; essais++) {
        const lot = await discoverMotCle({ ...params, page: p });
        if (seq !== searchSeq.current) return;
        if (lot.length === 0) {
          more = false;
          break;
        }
        found.push(...lot);
        const nouveaux = found.filter((r) => !suivi.has(keyOf(r))).length;
        if (nouveaux >= 12 || essais >= 4) break;
        p++;
      }
      setMotClePage(p);
      setMotCleMore(more);
      setResults((prev) => {
        if (!append) return found;
        const seen = new Set(prev.map(keyOf));
        return [...prev, ...found.filter((r) => !seen.has(keyOf(r)))];
      });
      setStatus('done');
    } catch (err) {
      if (seq === searchSeq.current) {
        setError(err.message);
        setErreurReseau(estErreurReseau(err));
        setStatus('error');
      }
    }
  }

  // Toucher un mot-clé l'ouvre ; le retoucher le referme (retour aux propositions).
  function choisirMotCle(mot) {
    if (motCle?.id === mot.id) {
      setMotCle(null);
      setResults([]);
      return;
    }
    setResults([]);
    setMotClePage(1);
    setMotCleMore(true);
    setMotCle(mot);
  }

  // Titres ajoutés pendant cette séance. La découverte (genre, acteur,
  // tendances) masque ce qu'on a déjà — mais un titre qu'on vient d'ajouter
  // ne doit pas disparaître sous le doigt : il reste affiché, avec sa pastille
  // dorée, jusqu'au prochain lancement.
  const [ajoutsSeance, setAjoutsSeance] = useState(() => new Set());
  const garderAffiche = (key) => setAjoutsSeance((prev) => new Set(prev).add(key));
  const dejaChezMoi = (item) =>
    suivi.has(keyOf(item)) && !ajoutsSeance.has(keyOf(item));

  async function handleToggleFollow(item) {
    const key = keyOf(item);
    try {
      if (suivi.has(key)) {
        await removeFromSuivi(item.mediaType, item.id);
      } else {
        await addToSuivi(item);
        garderAffiche(key);
        releverDisponibilite(); // non bloquant : la pastille arrive dès que TMDB a répondu
      }
      loadSuivi();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSetStatus(item, newStatus) {
    try {
      await apiSetStatus(item.mediaType, item.id, newStatus);
      vibre();
      loadSuivi();
    } catch (err) {
      setError(err.message);
    }
  }

  // Statut choisi dans le menu d'appui long. Le titre peut venir d'une
  // recherche : dans ce cas on l'ajoute au suivi avant de poser le statut,
  // sinon choisir « Vu » sur un titre pas encore suivi ne ferait rien.
  async function handlePickStatus(item, newStatus) {
    setStatusMenu(null);
    try {
      const nouveau = !suivi.has(keyOf(item));
      if (nouveau) {
        await addToSuivi(item);
        garderAffiche(keyOf(item));
      }
      await apiSetStatus(item.mediaType, item.id, newStatus);
      vibre();
      loadSuivi();
      if (nouveau) releverDisponibilite();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRemoveFromSuivi(item) {
    setStatusMenu(null);
    try {
      await removeFromSuivi(item.mediaType, item.id);
      loadSuivi();
    } catch (err) {
      setError(err.message);
    }
  }

  // Premier choix de langue (écran de bienvenue).
  async function applyInitialLanguage(value, onProgress) {
    const res = await chooseInitialLanguage(value, onProgress);
    setCatalogLang(value);
    setNeedLanguage(false);
    loadSuivi();
    return res;
  }

  // Changement depuis les réglages : les fiches enregistrées sont re-téléchargées.
  async function applyLanguageChange(value, onProgress) {
    const res = await changeCatalogLanguage(value, onProgress);
    setCatalogLang(value);
    loadSuivi(); // les titres et affiches en base ont changé
    setSuggestions([]); // recalculées dans la nouvelle langue au prochain passage
    setResults([]);
    getGenres().then(setGenres).catch(() => {});
    return res;
  }

  async function handleCreateListe(name) {
    try {
      const created = await apiCreateListe(name);
      // Une liste créée est visible par les amis : on propose tout de suite de la
      // garder pour soi, plutôt que de la découvrir publique plus tard.
      if (partage?.actif && window.confirm(
        `La liste « ${name} » sera visible par tes amis. La passer en privée ?`
      )) {
        await apiSetListePrive(created.id, true);
      }
      loadListes();
      return created;
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSetListePrive(id, prive) {
    try {
      await apiSetListePrive(id, prive);
      loadListes();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteListe(id) {
    try {
      await apiDeleteListe(id);
      loadListes();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAddToListe(listeId, item) {
    try {
      await apiAddToListe(listeId, item);
      loadListes();
      loadSuivi(); // ajouter à une liste ajoute aussi au suivi
    } catch (err) {
      setError(err.message);
    }
  }

  // Ajout groupé depuis l'écran « Ajouter des titres ». Les titres viennent
  // déjà du suivi : on les pose dans la liste, puis on rafraîchit une seule
  // fois plutôt qu'à chaque titre.
  async function handleAddManyToListe(listeId, items) {
    try {
      for (const item of items) await apiAddToListe(listeId, item);
      loadListes();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRemoveFromListe(listeId, item) {
    try {
      await apiRemoveFromListe(listeId, item.mediaType, item.id);
      loadListes();
    } catch (err) {
      setError(err.message);
    }
  }

  // Bouton « retour » d'Android. Il se comporte comme les flèches de retour de
  // l'interface : il ferme d'abord ce qui est ouvert par-dessus (sauvegarde,
  // à propos, fiche), puis dépile les onglets dans l'ordre où on les a
  // consultés, et ne quitte que depuis l'accueil.
  //
  // Ce que fait l'appui est recalculé à chaque rendu et rangé dans `backRef` ;
  // l'écoute, elle, n'est posée qu'une seule fois (au démarrage). C'est
  // volontaire : la pose d'une écoute Capacitor est asynchrone, donc
  // réinstaller l'écoute à chaque changement d'écran retirait l'ancienne
  // *avant* qu'elle ne soit réellement posée. Les écoutes périmées
  // s'accumulaient, chacune figée sur l'état qu'elle avait vu ; celle restée
  // sur la photo de l'accueil quittait l'application, quel que soit l'écran
  // réellement affiché.
  const backRef = useRef(null);
  backRef.current = () => {
    if (showLanguage) setShowLanguage(false);
    else if (statusMenu) setStatusMenu(null);
    else if (showStats) setShowStats(false);
    else if (showAmis && openDetail) closeDetail(); // la fiche d'un titre ouverte depuis un ami
    else if (showPartage) setShowPartage(false);
    else if (showProfiles) setShowProfiles(false);
    else if (surcouche && !openDetail) surcouche.fermer(); // une fiche ouverte par-dessus se ferme d'abord
    else if (showAmis) setShowAmis(false);
    else if (showBackup) setShowBackup(false);
    else if (showPlateformes) setShowPlateformes(false);
    else if (showNotifications) setShowNotifications(false);
    else if (showAbout) setShowAbout(false);
    else if (openDetail) closeDetail();
    else if (ficheOrigine) retourFiche();
    else if (tabStack.length > 0) goBackTab();
    else if (view !== 'search') goTo('search', { push: false });
    else {
      // Dernière chance avant de quitter. On ne l'attend pas : faire patienter
      // devant un écran figé serait pire que de rater un envoi, que le bandeau
      // rattrapera de toute façon au prochain lancement.
      autoSauvegardeRef.current();
      Capacitor.exitApp();
    }
  };

  useEffect(() => {
    let handle = null;
    let annule = false; // démontage avant la fin de la pose : on retire quand même
    Capacitor.addListener('backButton', () => backRef.current()).then((h) => {
      handle = h;
      if (annule) h.remove();
    });
    return () => {
      annule = true;
      handle?.remove();
    };
  }, []);

  // Sauvegarde automatique dans le Drive.
  //
  // Deux moments : quand on quitte l'application (le plus utile — c'est là
  // qu'on risque de perdre ce qu'on vient de faire), et quand on y revient si
  // la précédente n'a pas abouti. Elle ne part que s'il y a du nouveau, et
  // n'affiche jamais rien : sans compte Google relié ou sans autorisation
  // valide, elle renonce en silence et le bandeau reste.
  //
  // Même précaution que pour le bouton retour : l'écoute est posée **une seule
  // fois**, et va lire l'état courant au moment où elle se déclenche.
  const autoSauvegardeRef = useRef(() => {});
  autoSauvegardeRef.current = async () => {
    // La fiche partagée suit le même rythme que la sauvegarde : en quittant, en
    // revenant. Discret, et sans effet si le partage n'est pas activé.
    publierPartageAuto();
    await sauvegardeAutomatique();
  };

  // Le bandeau suit l'état réel, en direct : chaque changement de la sauvegarde (modification,
  // envoi réussi ou raté) relance le calcul. Tant qu'une attente est en cours on le relance aussi
  // toutes les 30 s, pour franchir le seuil des 10 min sans qu'il se passe autre chose.
  useEffect(() => surChangementDeSauvegarde(() => setVersionSauvegarde((n) => n + 1)), []);
  // Retour de la connexion : un envoi raté faute de réseau repart tout seul (voir `reprendreApresReseau`).
  useEffect(() => demarrerEcouteReseau(), []);
  const etatSauvegarde = lireEtatSauvegarde();
  const enAttente = etatSauvegarde.enAttente;
  useEffect(() => {
    if (!enAttente) return undefined;
    const id = setInterval(() => setVersionSauvegarde((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, [enAttente]);
  void versionSauvegarde; // lu pour que le rendu suive
  const bandeau = bandeauSauvegarde({ ...etatSauvegarde, enLigne });
  const rappelAffiche = bandeau && bandeau.cause !== rappelMasque ? bandeau : null;

  // Rattrapage au lancement. Indispensable et pas redondant avec l'écoute
  // ci-dessous : quand Android supprime l'application de la mémoire — ce qu'il
  // fait souvent dès qu'on la quitte — la réouverture est un **démarrage à
  // froid**, et `appStateChange` ne se déclenche pas. Sans ce rattrapage, une
  // sauvegarde coupée en partant n'était jamais reprise, et le bandeau restait
  // indéfiniment.
  useEffect(() => {
    if (!activeProfile) return;
    rafraichirPartage();
    autoSauvegardeRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfile]);

  useEffect(() => {
    let handle = null;
    let annule = false;
    Capacitor.addListener('appStateChange', () => {
      // On tente dans les deux sens : en partant (au cas où l'application ne
      // serait pas rouverte de sitôt) et en revenant (là, on a tout le temps
      // de finir l'envoi).
      autoSauvegardeRef.current();
    }).then((h) => {
      handle = h;
      if (annule) h.remove();
    });
    return () => {
      annule = true;
      handle?.remove();
    };
  }, []);

  // À la fermeture de la fiche, on recharge : cocher des épisodes / marquer vu
  // a pu faire passer le titre d'une liste à l'autre.
  function closeDetail() {
    setOpenDetail(null);
    loadSuivi();
  }

  const cardProps = {
    onToggleFollow: handleToggleFollow,
    onSetStatus: handleSetStatus,
    onOpenDetail: setOpenDetail,
    onLongPress: setStatusMenu,
  };

  // Le panneau commun de la recherche. Un mot-clé part chez TMDB, qui sait filtrer par plateforme ;
  // une recherche par titre ou par acteur, non : une ligne le dit.
  const barreRecherche = {
    vides: FILTRES_DECOUVERTE_VIDES,
    actifs: filtresDecouverteActifs,
    genres,
    ...(searchMode === 'keyword'
      ? {
          surMesPlateformes: {
            nbChoisies: lirePlateformes().length,
            masques: 0,
            onChoisir: () => setShowPlateformes(true),
          },
        }
      : { note: 'Pas de filtre par plateforme ici : TMDB ne le permet pas pour une recherche.' }),
  };

  // Les filtres (année, genre, tri) jouent sur ce qui est déjà affiché : TMDB ne filtre pas ces listes.
  // Pour un mot-clé, le type et les plateformes sont déjà passés par TMDB (`results` en tient compte).
  const resultsAffiches = appliquerFiltresDecouverte(results, filtresRecherche);

  // Par mot-clé et par acteur, on cherche à découvrir : ce qu'on a déjà est masqué. Par titre, on le
  // garde — on y cherche souvent un titre précis pour l'ouvrir.
  const decouverte = searchMode === 'keyword' || searchMode === 'actor';
  const filteredResults = decouverte
    ? resultsAffiches.filter((r) => !dejaChezMoi(r))
    : resultsAffiches;
  const masques = resultsAffiches.length - filteredResults.length;
  // Un filtre qui vide une liste pourtant non vide : message différent de « Aucun résultat »
  // (qui, lui, dit que la recherche n'a rien donné).
  const filtresToutEcarte =
    filtresDecouverteActifs(filtresRecherche) &&
    results.length > 0 &&
    resultsAffiches.length === 0;

  // Écran de recherche à vide (titre / acteur, avant toute frappe) : on propose
  // l'accueil (Tendances / Nouveautés / À venir) plutôt qu'un écran vide.
  const isDefault = searchMode !== 'keyword' && !hasSearched;
  // Le panneau : dès qu'il y a une recherche ; pour un mot-clé, une fois un mot-clé ouvert.
  const barreVisible = hasSearched && (searchMode !== 'keyword' || !!motCle);
  // Passage d'un onglet à l'autre : on rafraîchit les données dont il a besoin.
  // `push` alimente l'historique de navigation ; on le laisse à false quand
  // c'est justement le retour qui nous amène là (sinon on tournerait en rond).
  function goTo(next, { push = true } = {}) {
    if (next === view) return;
    // Pile bornée : un aller-retour répété entre deux onglets ne doit pas
    // obliger à appuyer trente fois sur retour pour sortir.
    if (push) setTabStack((prev) => [...prev, view].slice(-10));
    showTab(next);
  }

  // Revient à l'onglet précédemment consulté (retour Android).
  function goBackTab() {
    const prev = tabStack[tabStack.length - 1];
    setTabStack((s) => s.slice(0, -1));
    showTab(prev);
  }

  function showTab(next) {
    setView(next);
    if (next === 'tonight' || next === 'lists') loadSuivi();
    if (next === 'tonight') loadSuggestions();
  }

  // Premier lancement : on demande la langue du catalogue avant d'entrer.
  if (needLanguage) {
    return (
      <>
        <CatalogLanguage
          current={null}
          onApply={applyInitialLanguage}
          welcome
          onRestore={() => setShowBackup(true)}
        />
        {showBackup && activeProfile && (
          <Backup
            profileId={activeProfile}
            profileName={profiles.find((p) => p.id === activeProfile)?.name || 'Mon profil'}
            onRestored={handleRestored}
            onClose={() => setShowBackup(false)}
          />
        )}
      </>
    );
  }

  return (
    <DispoContext.Provider value={suivi}>
    <div className="app">
      <header className="appbar">
        <span className="brand__dot" aria-hidden="true"></span>
        <span className="brand__name">Vault Watch</span>
        <button
          className="appbar__profile"
          onClick={() => goTo('settings')}
          title="Profil et réglages"
          aria-label="Profil et réglages"
        >
          <Avatar
            name={profiles.find((p) => p.id === activeProfile)?.name}
            value={profiles.find((p) => p.id === activeProfile)?.avatar}
            size={32}
          />
        </button>
      </header>

      {rappelAffiche && !showBackup && (
        <div className="rappel panel panel--accent" role="alert">
          <span>{rappelAffiche.texte}</span>
          <button className="btn" onClick={() => setShowBackup(true)}>
            {rappelAffiche.action}
          </button>
          <button
            className="rappel__fermer"
            onClick={() => setRappelMasque(rappelAffiche.cause)}
            aria-label="Masquer le rappel"
          >
            ×
          </button>
        </div>
      )}

      <main className="content">
      <div key={view} className="view-enter">

      {view === 'search' && (
        <>
          {/* Le champ de recherche d'abord : c'est ce pour quoi on ouvre l'écran.
              Les modes et les filtres viennent ensuite, pas l'inverse. */}
          <SearchBar
            key={barreCle}
            onSearch={handleSearch}
            mode={searchMode}
            placeholder={
              searchMode === 'actor'
                ? 'Chercher un acteur…'
                : searchMode === 'keyword'
                  ? 'Un thème : marvel, zombie, time travel…'
                  : 'Chercher un film ou une série…'
            }
          />

          <div className="seg" aria-label="Chercher par">
            {[
              ['title', 'Titre'],
              ['actor', 'Acteur'],
              ['keyword', 'Mot-clé'],
            ].map(([v, label]) => (
              <button
                key={v}
                className={searchMode === v ? 'on' : ''}
                onClick={() => changeMode(v)}
              >
                {label}
              </button>
            ))}
          </div>

          {searchMode === 'keyword' && !hasSearched && (
            <p className="hint">
              Tape un thème, en anglais : « marvel », « zombie », « time travel »… Les mots-clés du catalogue
              TMDB sont en anglais.
            </p>
          )}

          {searchMode === 'keyword' && hasSearched && motsCles.length > 0 && (
            <div className="chips-scroll chips-scroll--page" role="group" aria-label="Mots-clés">
              {motsCles.map((k) => (
                <button
                  key={k.id}
                  className={`chip ${motCle?.id === k.id ? 'on' : ''}`}
                  aria-pressed={motCle?.id === k.id}
                  onClick={() => choisirMotCle(k)}
                >
                  {k.name}
                </button>
              ))}
            </div>
          )}

          {barreVisible && (
            <BarreFiltres
              filtres={filtresRecherche}
              onChange={setFiltresRecherche}
              {...barreRecherche}
            />
          )}

          {searchMode === 'actor' && person && (
            <div className="actor-head">
              {person.photoUrl && <img src={person.photoUrl} alt={person.name} />}
              <span>
                Films &amp; séries avec <b>{person.name}</b>
              </span>
              {ficheOrigine && (
                <button className="btn btn--ghost" onClick={retourFiche}>
                  Retour à la fiche
                </button>
              )}
            </div>
          )}

          {searchMode === 'keyword' && motCle && (
            <div className="actor-head">
              <span>
                Mot-clé : <b>{motCle.name}</b>
              </span>
            </div>
          )}

          {status === 'loading' && <GrilleFantome />}
          {status === 'error' &&
            (erreurReseau ? (
              <HorsLigne onRetry={() => handleSearch(derniereRecherche.current)} />
            ) : (
              <Vide icone="info" titre="La recherche a échoué" texte={error} />
            ))}
          {status === 'done' &&
            hasSearched &&
            searchMode === 'actor' &&
            !person && <p className="hint">Aucun acteur trouvé.</p>}
          {status === 'done' && hasSearched && searchMode === 'keyword' && !motCle && motsCles.length === 0 && (
            <Vide
              icone="search"
              titre={`Aucun mot-clé pour « ${derniereRecherche.current} »`}
              texte="Les mots-clés du catalogue TMDB sont en anglais : essaie « marvel », « zombie », « time travel »."
            />
          )}
          {status === 'done' &&
            hasSearched &&
            filteredResults.length === 0 &&
            !(searchMode === 'actor' && !person) &&
            !(searchMode === 'keyword' && !motCle) && (
              <Vide
                icone="search"
                titre={
                  filtresToutEcarte
                    ? 'Aucun titre ne correspond'
                    : masques > 0
                      ? 'Tu as déjà tout'
                      : searchMode === 'keyword'
                        ? 'Aucun titre pour ce mot-clé'
                        : 'Aucun résultat'
                }
                action={
                  filtresToutEcarte
                    ? { label: 'Réinitialiser', onClick: () => setFiltresRecherche(FILTRES_DECOUVERTE_VIDES) }
                    : undefined
                }
                texte={
                  filtresToutEcarte
                    ? 'Tes filtres écartent tous les résultats de cette recherche.'
                    : masques > 0
                      ? 'Tu as déjà tous ces titres dans ton suivi.'
                      : searchMode === 'keyword'
                        ? 'Les mots-clés du catalogue sont en anglais : essaie un autre mot-clé proposé, ou la version anglaise.'
                        : 'Essaie une autre orthographe, ou cherche par acteur.'
                }
              />
            )}
          {status === 'done' && decouverte && masques > 0 && filteredResults.length > 0 && (
            <p className="hint hint--small">
              {masques === 1
                ? '1 titre que tu as déjà est masqué.'
                : `${masques} titres que tu as déjà sont masqués.`}
            </p>
          )}

          {status === 'done' && hasSearched && filteredResults.length > 0 && (
            <header className="sec__head">
              <div className="sec__txt">
                <h3 className="sec__title">
                  Résultats <span className="sec__count">{filteredResults.length}</span>
                </h3>
              </div>
            </header>
          )}

          {isDefault && (
            <>
              <header className="sec__head">
                <div className="sec__txt">
                  <h3 className="sec__title">Tendances</h3>
                  <p className="sec__sub">Ce que tout le monde regarde en ce moment</p>
                </div>
              </header>
              <Rubriques
                rubriques={[['tendances', 'Tendances']]}
                filtres={filtresRecherche}
                onFiltres={setFiltresRecherche}
                barre={barreRecherche}
                suivi={suivi}
                dejaChezMoi={dejaChezMoi}
                cardProps={cardProps}
                resetKey={catalogLang}
              />
            </>
          )}

          <section className="grid">
            {filteredResults.map((item) => (
              <MovieCard
                key={keyOf(item)}
                item={item}
                isFollowed={suivi.has(keyOf(item))}
                status={suivi.get(keyOf(item))?.status}
                {...cardProps}
              />
            ))}
          </section>

          {searchMode === 'title' && titreMore && status === 'done' && hasSearched && (
            <div className="voirplus">
              <button className="btn btn--ghost" onClick={chargerPlusTitres}>
                Voir plus
              </button>
            </div>
          )}

          {searchMode === 'keyword' &&
            motCle &&
            motCleMore &&
            status === 'done' &&
            filteredResults.length > 0 && (
              <div className="voirplus">
                <button
                  className="btn btn--ghost"
                  onClick={() => runMotCle(motCle, motClePage + 1, true)}
                >
                  Voir plus
                </button>
              </div>
            )}
        </>
      )}

      {view === 'lists' && (
        <Lists
          items={Array.from(suivi.values())}
          listes={listes}
          onCreateListe={handleCreateListe}
          onDeleteListe={handleDeleteListe}
          onSetPrive={handleSetListePrive}
          partageActif={!!partage?.actif}
          onAddManyToListe={handleAddManyToListe}
          onSurcouche={setSurcouche}
          filtres={filtresListes}
          onFiltres={setFiltresListes}
          genres={genres}
          onOpenStats={() => setShowStats(true)}
          onSearch={() => goTo('search')}
          onOpenPlateformes={() => setShowPlateformes(true)}
          {...cardProps}
        />
      )}

      {view === 'tonight' && (
        <Tonight
          items={Array.from(suivi.values())}
          cardProps={cardProps}
          suggestions={suggestions}
          suggestionsLoading={suggestionsLoading}
          onRefreshSuggestions={loadSuggestions}
          suivi={suivi}
          dejaChezMoi={dejaChezMoi}
          catalogLang={catalogLang}
          subTab={tonightTab}
          onSubTab={setTonightTab}
          onSearch={() => goTo('search')}
          profileId={activeProfile}
          onSurcouche={setSurcouche}
          filtres={filtresSoir}
          onFiltres={setFiltresSoir}
          genres={genres}
        />
      )}

      {view === 'settings' && (
        <Settings
          profiles={profiles}
          activeProfile={activeProfile}
          onOpenProfiles={() => setShowProfiles(true)}
          onOpenStats={() => setShowStats(true)}
          onOpenPartage={() => setShowPartage(true)}
          onOpenAmis={() => setShowAmis(true)}
          partageDisponible={partageDisponible()}
          partageActif={!!partage?.actif}
          onSelectProfile={handleSelectProfile}
          choixTheme={choixTheme}
          onChoixTheme={changerTheme}
          catalogLang={catalogLang}
          catalogLangLabel={languageLabel(catalogLang)}
          onOpenLanguage={() => setShowLanguage(true)}
          onOpenBackup={() => setShowBackup(true)}
          onOpenNotifications={() => setShowNotifications(true)}
          onOpenPlateformes={() => setShowPlateformes(true)}
          nbPlateformes={lirePlateformes().length /* relu : Découvrir peut l'avoir changé */}
          onOpenAbout={() => setShowAbout(true)}
          suiviCount={suivi.size}
        />
      )}

      {view === 'discover' && (
        <Decouvrir
          items={Array.from(suivi.values())}
          suivi={suivi}
          dejaChezMoi={dejaChezMoi}
          cardProps={cardProps}
          resetKey={catalogLang}
          onSurcouche={setSurcouche}
          filtres={filtresDecouverte}
          onFiltres={setFiltresDecouverte}
          genres={genres}
          onOpenPlateformes={() => setShowPlateformes(true)}
        />
      )}
      </div>
      </main>

      <nav className="tabbar">
        {[
          ['search', 'Recherche', 'search'],
          ['tonight', 'Ce soir', 'film'],
          ['lists', 'Mes listes', 'lists'],
          ['discover', 'Découvrir', 'compass'],
        ].map(([v, label, icon]) => (
          <button
            key={v}
            className={view === v ? 'is-active' : ''}
            onClick={() => goTo(v)}
            aria-current={view === v ? 'page' : undefined}
          >
            <Icon name={icon} size={22} />
            {label}
          </button>
        ))}
      </nav>

      {/* Avant la fiche d'un titre : celle-ci s'ouvre par-dessus quand on touche une affiche. */}
      {showAmis && activeProfile && (
        <Amis
          cardProps={cardProps}
          suivi={suivi}
          onSurcouche={setSurcouche}
          onClose={() => setShowAmis(false)}
        />
      )}

      {openDetail && (
        <Detail
          // Passer d'un film de la saga à un autre repart d'une fiche neuve
          // (note, listes, épisodes, défilement en haut).
          key={keyOf(openDetail)}
          item={openDetail}
          suivi={suivi}
          cardProps={cardProps}
          isFollowed={suivi.has(keyOf(openDetail))}
          status={suivi.get(keyOf(openDetail))?.status}
          listes={listes}
          onToggleFollow={handleToggleFollow}
          onSetStatus={handleSetStatus}
          onCreateListe={handleCreateListe}
          onAddToListe={handleAddToListe}
          onRemoveFromListe={handleRemoveFromListe}
          onClose={closeDetail}
          onOpenActor={handleOpenActor}
        />
      )}

      {showStats && <Stats genres={genres} onClose={() => setShowStats(false)} />}

      {showPartage && activeProfile && (
        <Partage
          profileName={profiles.find((p) => p.id === activeProfile)?.name || ''}
          onChanged={() => {
            rafraichirPartage();
            loadListes();
          }}
          onClose={() => setShowPartage(false)}
        />
      )}

      {showProfiles && (
        <Profiles
          profiles={profiles}
          activeId={activeProfile}
          onSelect={(id) => {
            handleSelectProfile(id);
            setShowProfiles(false);
          }}
          onCreate={handleCreateProfile}
          onRename={handleRenameProfile}
          onSetAvatar={handleSetProfileAvatar}
          onCountData={countProfileData}
          onDelete={handleDeleteProfile}
          onClose={() => setShowProfiles(false)}
        />
      )}

      {showBackup && activeProfile && (
        <Backup
          profileId={activeProfile}
          profileName={profiles.find((p) => p.id === activeProfile)?.name || 'Mon profil'}
          onRestored={handleRestored}
          onClose={() => setShowBackup(false)}
        />
      )}

      {showPlateformes && (
        <MesPlateformes onClose={() => setShowPlateformes(false)} onChange={setNbPlateformes} />
      )}

      {showNotifications && (
        <Notifications onClose={() => setShowNotifications(false)} />
      )}

      {showAbout && <About onClose={() => setShowAbout(false)} />}

      {showLanguage && (
        <CatalogLanguage
          current={catalogLang}
          onApply={applyLanguageChange}
          onClose={() => setShowLanguage(false)}
        />
      )}

      {statusMenu && (
        <StatusMenu
          item={statusMenu}
          isFollowed={suivi.has(keyOf(statusMenu))}
          status={suivi.get(keyOf(statusMenu))?.status}
          onPick={handlePickStatus}
          onRemove={handleRemoveFromSuivi}
          onClose={() => setStatusMenu(null)}
        />
      )}
    </div>
    </DispoContext.Provider>
  );
}
