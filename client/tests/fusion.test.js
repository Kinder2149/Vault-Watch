// Fusion de deux versions d'un profil (mission B6-1) : les règles figées le 2026-10-27, sur des profils d'exemple.
import { describe, it, expect } from 'vitest';
import { fusionnerProfils, statutFusionne } from '../src/fusion.js';
import { validateBackup, BACKUP_FORMAT, BACKUP_VERSION } from '../src/backup.js';

const titre = (tmdbId, extra = {}) => ({
  tmdbId,
  mediaType: 'movie',
  title: `Film ${tmdbId}`,
  year: '2020',
  releaseDate: '2020-01-01',
  posterUrl: null,
  status: 'a_voir',
  note: null,
  rating: null,
  runtime: null,
  releaseRegion: null,
  genres: null,
  addedAt: '2026-01-10 10:00:00',
  ...extra,
});
const serie = (tmdbId, extra = {}) => titre(tmdbId, { mediaType: 'tv', title: `Série ${tmdbId}`, ...extra });

function profil(extra = {}) {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: '2026-10-01T00:00:00.000Z',
    profile: { id: 'p1', name: 'Marie', avatar: null },
    suivi: [],
    episodesVus: [],
    visionnages: [],
    listes: [],
    ...extra,
  };
}

const sansDate = (d) => ({ ...d, exportedAt: undefined });
const statuts = (data) => Object.fromEntries(data.suivi.map((t) => [`${t.mediaType}-${t.tmdbId}`, t.status]));

describe('titres', () => {
  it("l'union réunit les titres des deux côtés et les compte dans le résumé", () => {
    const local = profil({ suivi: [titre(1), titre(2)] });
    const drive = profil({ suivi: [titre(2), titre(3), serie(3)] });
    const { data, resume } = fusionnerProfils(local, drive);
    expect(data.suivi.map((t) => `${t.mediaType}-${t.tmdbId}`).sort()).toEqual(
      ['movie-1', 'movie-2', 'movie-3', 'tv-3']
    );
    expect(resume.titres).toEqual({ duDrive: 2, duTelephone: 1 });
    expect(resume.changeLeTelephone).toBe(true);
    expect(resume.changeLeDrive).toBe(true);
  });

  it('le statut le plus avancé gagne, dans les deux sens', () => {
    expect(statutFusionne('a_voir', 'en_cours')).toBe('en_cours');
    expect(statutFusionne('en_cours', 'a_voir')).toBe('en_cours');
    expect(statutFusionne('en_cours', 'vu')).toBe('vu');
    expect(statutFusionne('vu', 'a_voir')).toBe('vu');
    expect(statutFusionne('vu', 'vu')).toBe('vu');
  });

  it('« Abandonné » d\'un côté : la valeur de ce téléphone, quel que soit l\'autre statut', () => {
    expect(statutFusionne('abandonne', 'vu')).toBe('abandonne');
    expect(statutFusionne('vu', 'abandonne')).toBe('vu');
    expect(statutFusionne('abandonne', 'a_voir')).toBe('abandonne');
    expect(statutFusionne('a_voir', 'abandonne')).toBe('a_voir');
  });

  it('les statuts changés sont comptés de chaque côté', () => {
    const local = profil({ suivi: [titre(1, { status: 'a_voir' }), titre(2, { status: 'vu' }), titre(3)] });
    const drive = profil({ suivi: [titre(1, { status: 'vu' }), titre(2, { status: 'a_voir' }), titre(3)] });
    const { data, resume } = fusionnerProfils(local, drive);
    expect(statuts(data)).toEqual({ 'movie-1': 'vu', 'movie-2': 'vu', 'movie-3': 'a_voir' });
    expect(resume.statuts).toEqual({ surTelephone: 1, surDrive: 1 });
  });

  it('la note et les étoiles : celles du téléphone, sinon celles du Drive ; en désaccord, celles du téléphone', () => {
    const local = profil({
      suivi: [
        titre(1, { note: 'Mon avis', rating: 4 }),
        titre(2),
        titre(3, { note: 'Pareil', rating: 5 }),
      ],
    });
    const drive = profil({
      suivi: [
        titre(1, { note: 'Autre avis', rating: 2 }),
        titre(2, { note: 'Avis du Drive', rating: 3 }),
        titre(3, { note: 'Pareil', rating: 5 }),
      ],
    });
    const { data, resume } = fusionnerProfils(local, drive);
    const parId = Object.fromEntries(data.suivi.map((t) => [t.tmdbId, t]));
    expect(parId[1]).toMatchObject({ note: 'Mon avis', rating: 4 });
    expect(parId[2]).toMatchObject({ note: 'Avis du Drive', rating: 3 });
    expect(parId[3]).toMatchObject({ note: 'Pareil', rating: 5 });
    expect(resume.notesEnDesaccord).toBe(1); // seul le titre 1 diverge
  });

  it("les champs manquants sont complétés par l'autre côté ; la date d'ajout la plus ancienne est gardée", () => {
    const local = profil({ suivi: [titre(1, { posterUrl: null, runtime: null, addedAt: '2026-03-01 08:00:00' })] });
    const drive = profil({
      suivi: [titre(1, { posterUrl: 'https://image/1.jpg', runtime: 120, addedAt: '2026-02-01 08:00:00' })],
    });
    const [t] = fusionnerProfils(local, drive).data.suivi;
    expect(t.posterUrl).toBe('https://image/1.jpg');
    expect(t.runtime).toBe(120);
    expect(t.addedAt).toBe('2026-02-01 08:00:00');
  });
});

describe('épisodes et visionnages', () => {
  it('épisodes vus : union, sans doublon, date de marquage la plus ancienne', () => {
    const local = profil({
      episodesVus: [
        { seriesId: 100, season: 1, episode: 1, markedAt: '2026-05-02' },
        { seriesId: 100, season: 1, episode: 2, markedAt: '2026-05-03' },
      ],
    });
    const drive = profil({
      episodesVus: [
        { seriesId: 100, season: 1, episode: 2, markedAt: '2026-05-01' },
        { seriesId: 100, season: 1, episode: 3, markedAt: '2026-05-04' },
        { seriesId: 100, season: 1, episode: 4, markedAt: '2026-05-05' },
      ],
    });
    const { data, resume } = fusionnerProfils(local, drive);
    expect(data.episodesVus.map((e) => e.episode)).toEqual([1, 2, 3, 4]);
    expect(data.episodesVus.find((e) => e.episode === 2).markedAt).toBe('2026-05-01');
    expect(resume.episodes).toEqual({ duDrive: 2, duTelephone: 1 });
  });

  it('visionnages : union sans doublon', () => {
    const v = (tmdbId, date, extra = {}) => ({ tmdbId, mediaType: 'movie', season: null, episode: null, date, ...extra });
    const local = profil({ visionnages: [v(1, '2026-01-01'), v(1, '2026-03-01')] });
    const drive = profil({ visionnages: [v(1, '2026-03-01'), v(1, '2026-04-01'), v(2, '2026-04-01')] });
    const { data, resume } = fusionnerProfils(local, drive);
    expect(data.visionnages).toHaveLength(4);
    expect(resume.visionnages).toEqual({ duDrive: 2, duTelephone: 1 });
  });
});

describe('listes', () => {
  const el = (tmdbId, addedAt = '2026-02-01') => ({ tmdbId, mediaType: 'movie', addedAt });

  it('deux listes de même nom (casse différente) deviennent une seule, privée si l\'une l\'est', () => {
    const local = profil({
      suivi: [titre(1), titre(2)],
      listes: [{ name: 'Soirée', prive: 0, createdAt: '2026-03-01', items: [el(1)] }],
    });
    const drive = profil({
      suivi: [titre(1), titre(2)],
      listes: [{ name: 'soirée ', prive: 1, createdAt: '2026-02-01', items: [el(1, '2026-01-15'), el(2)] }],
    });
    const { data, resume } = fusionnerProfils(local, drive);
    expect(data.listes).toHaveLength(1);
    const [l] = data.listes;
    expect(l.name).toBe('Soirée'); // le nom de ce téléphone
    expect(l.prive).toBe(1);
    expect(l.createdAt).toBe('2026-02-01');
    expect(l.items.map((i) => i.tmdbId)).toEqual([1, 2]);
    expect(l.items.find((i) => i.tmdbId === 1).addedAt).toBe('2026-01-15');
    expect(resume.listes).toEqual({ duDrive: 0, duTelephone: 0 });
    expect(resume.elements).toEqual({ duDrive: 1, duTelephone: 0 });
  });

  it('les listes distinctes sont toutes gardées', () => {
    const local = profil({ suivi: [titre(1)], listes: [{ name: 'A', prive: 0, createdAt: null, items: [el(1)] }] });
    const drive = profil({ suivi: [titre(1)], listes: [{ name: 'B', prive: 1, createdAt: null, items: [el(1)] }] });
    const { data, resume } = fusionnerProfils(local, drive);
    expect(data.listes.map((l) => l.name).sort()).toEqual(['A', 'B']);
    expect(data.listes.find((l) => l.name === 'B').prive).toBe(1);
    expect(resume.listes).toEqual({ duDrive: 1, duTelephone: 1 });
  });

  it("un élément dont le titre n'existe pas dans la fusion est écarté", () => {
    const local = profil({
      suivi: [titre(1)],
      listes: [{ name: 'A', prive: 0, createdAt: null, items: [el(1), el(99)] }],
    });
    const { data } = fusionnerProfils(local, profil());
    expect(data.listes[0].items.map((i) => i.tmdbId)).toEqual([1]);
  });
});

describe('profil, partage et amis', () => {
  it('nom, avatar et partage de ce téléphone, complétés par ceux du Drive', () => {
    const local = profil({ profile: { id: 'p1', name: 'Marie', avatar: null } });
    const drive = profil({
      profile: { id: 'p1', name: 'Autre nom', avatar: 'chat' },
      partage: { code: 'ABC', cle: 'secret', pseudo: 'marie', actif: 1, statutsPrives: '' },
    });
    const { data } = fusionnerProfils(local, drive);
    expect(data.profile).toEqual({ id: 'p1', name: 'Marie', avatar: 'chat' });
    expect(data.partage.code).toBe('ABC');
    const avecLocal = fusionnerProfils(
      profil({ partage: { code: 'MOI', cle: 'k', pseudo: 'm', actif: 1, statutsPrives: '' } }),
      drive
    );
    expect(avecLocal.data.partage.code).toBe('MOI');
  });

  it('amis : union par code', () => {
    const a = (code, pseudo) => ({ code, pseudo, avatar: null, ajoute: '2026-01-01' });
    const local = profil({ amis: [a('X', 'Xavier'), a('Y', 'Yann')] });
    const drive = profil({ amis: [a('Y', 'Yann bis'), a('Z', 'Zoé')] });
    const { data } = fusionnerProfils(local, drive);
    expect(data.amis.map((x) => x.code)).toEqual(['X', 'Y', 'Z']);
    expect(data.amis.find((x) => x.code === 'Y').pseudo).toBe('Yann'); // celui de ce téléphone
  });

  it('deux profils d\'identifiants différents ne se fusionnent pas', () => {
    expect(() =>
      fusionnerProfils(profil(), profil({ profile: { id: 'autre', name: 'Autre', avatar: null } }))
    ).toThrow(/profils différents/);
  });
});

describe('propriétés de la fusion', () => {
  const local = profil({
    suivi: [titre(1, { status: 'en_cours', note: 'a', rating: 3 }), titre(2, { status: 'abandonne' }), serie(5)],
    episodesVus: [{ seriesId: 5, season: 1, episode: 1, markedAt: '2026-05-01' }],
    listes: [{ name: 'Soirée', prive: 0, createdAt: '2026-03-01', items: [{ tmdbId: 1, mediaType: 'movie', addedAt: '2026-03-02' }] }],
    amis: [{ code: 'X', pseudo: 'Xavier', avatar: null, ajoute: '2026-01-01' }],
  });
  const drive = profil({
    suivi: [titre(1, { status: 'vu', note: 'b', rating: 5 }), titre(2, { status: 'vu' }), titre(3), serie(5)],
    episodesVus: [
      { seriesId: 5, season: 1, episode: 1, markedAt: '2026-04-01' },
      { seriesId: 5, season: 1, episode: 2, markedAt: '2026-04-02' },
    ],
    visionnages: [{ tmdbId: 3, mediaType: 'movie', season: null, episode: null, date: '2026-04-05' }],
    listes: [{ name: 'soirée', prive: 1, createdAt: '2026-02-01', items: [{ tmdbId: 3, mediaType: 'movie', addedAt: '2026-04-06' }] }],
    amis: [{ code: 'Z', pseudo: 'Zoé', avatar: null, ajoute: '2026-02-01' }],
  });

  it('deux profils identiques : rien ne change et le résumé est à zéro', () => {
    const { data, resume } = fusionnerProfils(local, local);
    expect(sansDate(data)).toEqual(sansDate({ ...local, version: local.version }));
    expect(resume.changeLeTelephone).toBe(false);
    expect(resume.changeLeDrive).toBe(false);
    expect(resume.notesEnDesaccord).toBe(0);
  });

  it('fusionner le résultat avec chacune des deux versions redonne le même résultat', () => {
    const { data: f } = fusionnerProfils(local, drive);
    expect(sansDate(fusionnerProfils(f, drive).data)).toEqual(sansDate(f));
    expect(sansDate(fusionnerProfils(f, local).data)).toEqual(sansDate(f));
    expect(sansDate(fusionnerProfils(local, f).data)).toEqual(sansDate(f));
  });

  it('le résultat est une sauvegarde valide, de même format', () => {
    const { data } = fusionnerProfils(local, drive);
    expect(() => validateBackup(data)).not.toThrow();
    expect(data.format).toBe(BACKUP_FORMAT);
    expect(data.version).toBe(BACKUP_VERSION);
  });

  it('ne modifie aucune des deux sauvegardes d\'origine', () => {
    const avant = JSON.stringify([local, drive]);
    fusionnerProfils(local, drive);
    expect(JSON.stringify([local, drive])).toBe(avant);
  });
});
