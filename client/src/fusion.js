// Couche Logique — fusion de deux versions d'un même profil (mission B6).
//
// Quand un autre appareil a modifié la sauvegarde Drive, on n'est plus obligé de choisir un côté : on réunit
// les deux. Ce fichier ne contient que la règle (aucun accès à la base ni au Drive) : il prend deux sauvegardes
// au format de `backup.js` et rend la sauvegarde fusionnée, que `importProfile` sait appliquer telle quelle,
// avec un résumé chiffré de ce qui s'ajoute dans chaque sens.
//
// Règles (figées le 2026-10-27) :
//  - titres, épisodes vus, visionnages, listes : union ;
//  - statut : le plus avancé (Vu > En cours > À voir) ; si l'un des deux est « Abandonné », celui de ce téléphone ;
//  - note et avis : ceux de ce téléphone s'il y en a, sinon ceux du Drive ; en désaccord, ceux de ce téléphone ;
//  - dates d'ajout et de marquage : la plus ancienne ;
//  - deux listes de même nom (sans tenir compte des majuscules) n'en font qu'une, privée si l'une l'est ;
//  - limite assumée : sans date par ligne, un titre supprimé d'un côté revient (annoncé dans le résumé).

const AVANCEMENT = { a_voir: 0, en_cours: 1, vu: 2 };

const cleTitre = (t) => `${t.mediaType}-${t.tmdbId}`;
const present = (v) => v !== null && v !== undefined && v !== '';
// La valeur de ce téléphone, sinon celle du Drive.
const prefere = (a, b) => (present(a) ? a : present(b) ? b : (a ?? b ?? null));
const plusAncienne = (a, b) => (!present(a) ? (b ?? null) : !present(b) ? a : a <= b ? a : b);

export function statutFusionne(local, drive) {
  const l = local || 'a_voir';
  const d = drive || 'a_voir';
  if (l === d) return l;
  if (l === 'abandonne' || d === 'abandonne') return l;
  return (AVANCEMENT[l] ?? 0) >= (AVANCEMENT[d] ?? 0) ? l : d;
}

function fusionnerTitre(l, d) {
  return {
    tmdbId: l.tmdbId,
    mediaType: l.mediaType,
    title: prefere(l.title, d.title),
    year: prefere(l.year, d.year),
    releaseDate: prefere(l.releaseDate, d.releaseDate),
    posterUrl: prefere(l.posterUrl, d.posterUrl),
    status: statutFusionne(l.status, d.status),
    note: prefere(l.note, d.note),
    rating: prefere(l.rating, d.rating),
    runtime: prefere(l.runtime, d.runtime),
    releaseRegion: prefere(l.releaseRegion, d.releaseRegion),
    genres: prefere(l.genres, d.genres),
    addedAt: plusAncienne(l.addedAt, d.addedAt),
  };
}

// Union de deux listes d'éléments, dans l'ordre : d'abord ceux de ce téléphone, puis ceux propres au Drive.
function union(locaux, drive, cle, fusionner = (l) => l) {
  const index = new Map();
  for (const e of locaux) index.set(cle(e), e);
  const vus = new Map();
  for (const e of locaux) vus.set(cle(e), fusionner(e, drive.find((x) => cle(x) === cle(e))));
  for (const e of drive) if (!index.has(cle(e))) vus.set(cle(e), e);
  return [...vus.values()];
}

const nom = (n) => String(n || '').trim().toLowerCase();

export function fusionnerProfils(local, drive) {
  if (local?.profile?.id !== drive?.profile?.id) {
    throw new Error('Deux sauvegardes de profils différents ne se fusionnent pas.');
  }
  const resume = {
    titres: { duDrive: 0, duTelephone: 0 },
    statuts: { surTelephone: 0, surDrive: 0 },
    notesEnDesaccord: 0,
    episodes: { duDrive: 0, duTelephone: 0 },
    visionnages: { duDrive: 0, duTelephone: 0 },
    listes: { duDrive: 0, duTelephone: 0 },
    elements: { duDrive: 0, duTelephone: 0 },
  };

  // --- Titres ---
  const titresDrive = new Map((drive.suivi || []).map((t) => [cleTitre(t), t]));
  const titresLocal = new Map((local.suivi || []).map((t) => [cleTitre(t), t]));
  const suivi = [];
  for (const l of local.suivi || []) {
    const d = titresDrive.get(cleTitre(l));
    if (!d) {
      suivi.push({ ...fusionnerTitre(l, {}) });
      resume.titres.duTelephone += 1;
      continue;
    }
    const f = fusionnerTitre(l, d);
    if (f.status !== (l.status || 'a_voir')) resume.statuts.surTelephone += 1;
    if (f.status !== (d.status || 'a_voir')) resume.statuts.surDrive += 1;
    if (
      (present(l.note) && present(d.note) && l.note !== d.note) ||
      (present(l.rating) && present(d.rating) && l.rating !== d.rating)
    ) {
      resume.notesEnDesaccord += 1;
    }
    suivi.push(f);
  }
  for (const d of drive.suivi || []) {
    if (titresLocal.has(cleTitre(d))) continue;
    suivi.push(fusionnerTitre(d, {}));
    resume.titres.duDrive += 1;
  }
  const existants = new Set(suivi.map(cleTitre));

  // --- Épisodes vus ---
  const cleEpisode = (e) => `${e.seriesId}-${e.season}-${e.episode}`;
  const episodesDrive = new Map((drive.episodesVus || []).map((e) => [cleEpisode(e), e]));
  const episodesLocal = new Map((local.episodesVus || []).map((e) => [cleEpisode(e), e]));
  const episodesVus = [];
  for (const l of local.episodesVus || []) {
    const d = episodesDrive.get(cleEpisode(l));
    episodesVus.push(d ? { ...l, markedAt: plusAncienne(l.markedAt, d.markedAt) } : l);
    if (!d) resume.episodes.duTelephone += 1;
  }
  for (const d of drive.episodesVus || []) {
    if (episodesLocal.has(cleEpisode(d))) continue;
    episodesVus.push(d);
    resume.episodes.duDrive += 1;
  }

  // --- Visionnages ---
  const cleVision = (v) => `${v.mediaType}|${v.tmdbId}|${v.season ?? ''}|${v.episode ?? ''}|${v.date}`;
  const visionsLocal = new Set((local.visionnages || []).map(cleVision));
  const visionsDrive = new Set((drive.visionnages || []).map(cleVision));
  const visionnages = [...(local.visionnages || [])];
  resume.visionnages.duTelephone = visionnages.filter((v) => !visionsDrive.has(cleVision(v))).length;
  for (const v of drive.visionnages || []) {
    if (visionsLocal.has(cleVision(v))) continue;
    visionnages.push(v);
    resume.visionnages.duDrive += 1;
  }

  // --- Listes ---
  const listesDrive = new Map((drive.listes || []).map((l) => [nom(l.name), l]));
  const listesLocal = new Map((local.listes || []).map((l) => [nom(l.name), l]));
  const cleElement = (it) => `${it.mediaType}-${it.tmdbId}`;
  const garder = (items) => items.filter((it) => existants.has(cleElement(it)));
  const listes = [];
  for (const l of local.listes || []) {
    const d = listesDrive.get(nom(l.name));
    if (!d) {
      listes.push({ ...l, items: garder(l.items || []) });
      resume.listes.duTelephone += 1;
      continue;
    }
    const items = garder(
      union(l.items || [], d.items || [], cleElement, (a, b) => ({
        ...a,
        addedAt: plusAncienne(a.addedAt, b?.addedAt),
      }))
    );
    const cleL = new Set((l.items || []).map(cleElement));
    const cleD = new Set((d.items || []).map(cleElement));
    resume.elements.duDrive += items.filter((it) => !cleL.has(cleElement(it))).length;
    resume.elements.duTelephone += items.filter((it) => !cleD.has(cleElement(it))).length;
    listes.push({
      name: l.name,
      prive: l.prive || d.prive ? 1 : 0,
      createdAt: plusAncienne(l.createdAt, d.createdAt),
      items,
    });
  }
  for (const d of drive.listes || []) {
    if (listesLocal.has(nom(d.name))) continue;
    listes.push({ ...d, items: garder(d.items || []) });
    resume.listes.duDrive += 1;
  }

  // --- Profil, partage, amis ---
  const amis = union(local.amis || [], drive.amis || [], (a) => a.code);
  const partage = local.partage ?? drive.partage;
  const data = {
    format: local.format,
    version: local.version,
    exportedAt: new Date().toISOString(),
    profile: {
      id: local.profile.id,
      name: prefere(local.profile.name, drive.profile.name),
      avatar: prefere(local.profile.avatar, drive.profile.avatar),
    },
    suivi,
    episodesVus,
    visionnages,
    listes,
    ...(partage ? { partage } : {}),
    ...(amis.length ? { amis } : {}),
  };

  const versTelephone =
    resume.titres.duDrive + resume.statuts.surTelephone + resume.episodes.duDrive +
    resume.visionnages.duDrive + resume.listes.duDrive + resume.elements.duDrive;
  const versDrive =
    resume.titres.duTelephone + resume.statuts.surDrive + resume.episodes.duTelephone +
    resume.visionnages.duTelephone + resume.listes.duTelephone + resume.elements.duTelephone;
  return {
    data,
    resume: { ...resume, changeLeTelephone: versTelephone > 0, changeLeDrive: versDrive > 0 },
  };
}

// Le résumé en français, pour l'écran de conflit : ce qui s'ajoute à ce téléphone, ce qui s'ajoute au Drive.
const pluriel = (n, un, plusieurs) => `${n} ${n > 1 ? plusieurs : un}`;

function enumerer(r, cote) {
  const morceaux = [];
  if (r.titres[cote]) morceaux.push(pluriel(r.titres[cote], 'titre', 'titres'));
  if (r.episodes[cote]) morceaux.push(pluriel(r.episodes[cote], 'épisode vu', 'épisodes vus'));
  if (r.visionnages[cote]) morceaux.push(pluriel(r.visionnages[cote], 'visionnage', 'visionnages'));
  if (r.listes[cote]) morceaux.push(pluriel(r.listes[cote], 'liste', 'listes'));
  if (r.elements[cote]) morceaux.push(pluriel(r.elements[cote], 'ajout à une liste', 'ajouts à des listes'));
  return morceaux;
}

export function decrireFusion(resume) {
  const versTelephone = enumerer(resume, 'duDrive');
  if (resume.statuts.surTelephone) {
    versTelephone.push(pluriel(resume.statuts.surTelephone, 'statut mis à niveau', 'statuts mis à niveau'));
  }
  const versDrive = enumerer(resume, 'duTelephone');
  if (resume.statuts.surDrive) {
    versDrive.push(pluriel(resume.statuts.surDrive, 'statut mis à niveau', 'statuts mis à niveau'));
  }
  return {
    telephone: versTelephone.length
      ? `Ce téléphone reçoit : ${versTelephone.join(', ')}.`
      : 'Rien à ajouter à ce téléphone.',
    drive: versDrive.length ? `Le Drive reçoit : ${versDrive.join(', ')}.` : 'Rien à ajouter au Drive.',
    notes: resume.notesEnDesaccord
      ? `${pluriel(resume.notesEnDesaccord, 'note ou avis diffère', 'notes ou avis diffèrent')} : celui de ce téléphone est gardé.`
      : null,
  };
}
