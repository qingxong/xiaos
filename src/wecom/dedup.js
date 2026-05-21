/** 防止企微重复回调导致多次回复（msgid 排重） */
const seen = new Map();
const TTL_MS = 60 * 60 * 1000;

function shouldProcess(msgid) {
  if (!msgid) return true;
  const now = Date.now();
  if (seen.has(msgid)) return false;
  seen.set(msgid, now);
  if (seen.size > 3000) {
    for (const [id, t] of seen) {
      if (now - t > TTL_MS) seen.delete(id);
    }
  }
  return true;
}

module.exports = { shouldProcess };
