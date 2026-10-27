// Le stockage local des préférences (profil actif, langue, compte Google,
// état de la sauvegarde cloud) n'existe pas dans Node : on le rejoue à
// l'identique, en mémoire.
class MemoryStorage {
  #data = new Map();
  getItem(k) { return this.#data.has(k) ? this.#data.get(k) : null; }
  setItem(k, v) { this.#data.set(k, String(v)); }
  removeItem(k) { this.#data.delete(k); }
  clear() { this.#data.clear(); }
  // Comme le vrai `Storage` : le code qui parcourt les clés (`length`, `key(i)`) doit pouvoir être testé.
  get length() { return this.#data.size; }
  key(i) { return [...this.#data.keys()][i] ?? null; }
}
globalThis.localStorage = new MemoryStorage();
