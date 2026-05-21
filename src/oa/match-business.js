const { getOptions } = require("./load-options");
const {
  resolveBusinessName,
  suggestSimilar,
} = require("./validate");

/**
 * 对候选业务名打分（用于从 LLM 意图中选 Top1）
 */
function scoreCandidate(query, name) {
  const q = String(query || "").trim();
  const n = String(name || "").trim();
  if (!q || !n) return 0;
  if (n === q) return 100;
  if (n.includes(q) || q.includes(n)) return 50;

  const qTokens = q.split(/[\s、,，/]+/).filter((t) => t.length >= 2);
  let hits = 0;
  for (const t of qTokens) {
    if (n.includes(t)) hits += 1;
  }

  const grams = new Set();
  for (let len = 2; len <= 4; len++) {
    for (let i = 0; i <= q.length - len; i++) {
      grams.add(q.slice(i, i + len));
    }
  }
  let gramHits = 0;
  for (const g of grams) {
    if (g.length >= 2 && n.includes(g)) gramHits += 1;
  }

  const tokenScore = hits > 0 ? 20 + hits * 10 : 0;
  const gramScore = gramHits >= 4 ? 45 : gramHits >= 2 ? 30 : 0;
  let score = Math.max(tokenScore, gramScore);

  const boostWords = [
    "海口",
    "三亚",
    "注册",
    "代账",
    "记账",
    "开户",
    "地址",
    "注销",
    "变更",
    "续费",
    "个体",
    "分公司",
  ];
  for (const w of boostWords) {
    if (q.includes(w) && n.includes(w)) score += 12;
  }

  return score;
}

function rankBusinessCandidates(queries) {
  const opts = getOptions();
  const byName = new Map();

  for (const q of queries) {
    if (!q) continue;
    for (const name of opts.businessNames) {
      const score = scoreCandidate(q, name);
      if (score <= 0) continue;
      const prev = byName.get(name) || 0;
      if (score > prev) byName.set(name, score);
    }
  }

  return [...byName.entries()]
    .map(([name, score]) => ({ name, score }))
    .sort((a, b) => b.score - a.score);
}

/**
 * 将 LLM 的 businessName / businessIntent 对齐为 OA 合法业务名
 * @returns {{ ok: boolean, businessName: string, via?: string, suggestions?: string[] }}
 */
function matchBusinessToOa(order) {
  const intent = String(order.businessIntent || "").trim();
  const nameField = String(order.businessName || "").trim();

  const tryList = [nameField, intent].filter(Boolean);
  for (const raw of tryList) {
    const resolved = resolveBusinessName(raw);
    if (resolved.ok) {
      return {
        ok: true,
        businessName: resolved.value,
        via: resolved.via || "exact",
        from: raw,
      };
    }
  }

  const ranked = rankBusinessCandidates(tryList);
  if (ranked.length > 0 && ranked[0].score >= 40) {
    const top = ranked[0];
    const second = ranked[1];
    if (!second || top.score > second.score) {
      return {
        ok: true,
        businessName: top.name,
        via: "fuzzy",
        from: intent || nameField,
      };
    }
  }

  const suggestions = [
    ...new Set([
      ...suggestSimilar(intent, getOptions().businessNames, 5),
      ...suggestSimilar(nameField, getOptions().businessNames, 5),
      ...ranked.slice(0, 5).map((r) => r.name),
    ]),
  ].slice(0, 5);

  return {
    ok: false,
    businessName: nameField || intent,
    suggestions,
    from: intent || nameField,
  };
}

/**
 * 合并 LLM 订单并写入匹配后的 businessName
 */
function applyBusinessMatch(order) {
  const matched = matchBusinessToOa(order);
  const next = { ...order };
  if (matched.ok) {
    next.businessName = matched.businessName;
    delete next.businessIntent;
    return { ok: true, order: next, match: matched };
  }
  return { ok: false, order: next, match: matched };
}

module.exports = {
  matchBusinessToOa,
  applyBusinessMatch,
  scoreCandidate,
  rankBusinessCandidates,
};
