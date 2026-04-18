// db.js — Database layer. All IndexedDB access goes through this file.
// Uses Dexie.js (loaded as a global from CDN in index.html).

const db = new Dexie("CustomClozeDB");
db.version(1).stores({
  words:   "++id, word, gramCat",
  history: "++id, wordId, sentenceHash"
});

/**
 * Compute the stable hash used to identify a sentence in the history table.
 * @param {number} wordId
 * @param {string} sentenceText - full raw sentence text including (parens)
 * @returns {string}
 */
function computeHash(wordId, sentenceText) {
  return btoa(unescape(encodeURIComponent(wordId + "|" + sentenceText)));
}

/**
 * Return all words. If gramCat is provided, filter to that category only.
 * @param {string|null} gramCat
 * @returns {Promise<Array>}
 */
export async function getWords(gramCat = null) {
  if (gramCat) return db.words.where("gramCat").equals(gramCat).toArray();
  return db.words.toArray();
}

/**
 * Return sorted list of all distinct gramCat values currently in the DB.
 * @returns {Promise<string[]>}
 */
export async function getCategories() {
  const words = await db.words.toArray();
  return [...new Set(words.map(w => w.gramCat))].sort();
}

/**
 * Add a new word. sentences must be an array of strings.
 * @param {{word: string, gramCat: string, sentences: string[]}} param0
 * @returns {Promise<number>} new word id
 */
export async function saveWord({ word, gramCat, sentences }) {
  return db.words.add({ word, gramCat, sentences });
}

/**
 * Delete a word and all its associated history records.
 * @param {number} wordId
 */
export async function deleteWord(wordId) {
  await db.history.where("wordId").equals(wordId).delete();
  await db.words.delete(wordId);
}

/**
 * Return all history records for a single word.
 * @param {number} wordId
 * @returns {Promise<Array>}
 */
export async function getHistory(wordId) {
  return db.history.where("wordId").equals(wordId).toArray();
}

/**
 * Create or update the history record for one sentence.
 * status must be "never_reviewed", "incorrect", or "correct".
 * @param {{wordId: number, sentenceHash: string, status: string}} param0
 */
export async function upsertHistory({ wordId, sentenceHash, status }) {
  const existing = await db.history
    .where({ wordId, sentenceHash })
    .first();
  if (existing) {
    await db.history.update(existing.id, { status, lastReviewed: Date.now() });
  } else {
    await db.history.add({ wordId, sentenceHash, status, lastReviewed: Date.now() });
  }
}

export { computeHash };
