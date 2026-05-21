const { getOptions } = require("./load-options");

/** 口语「代账」等映射到 OA 正式选项（别名目标若不在列表中则继续映射） */
const ALIAS_TO_OA = {
  代账: "代账续费",
  记账: "代账续费",
  注册公司: "海口有限公司注册",
  代理记账: "代账续费",
  银行开户: "海口银行开户",
  地址挂靠: "申亚大厦地址",
};

function suggestSimilar(input, candidates, limit = 5) {
  const q = String(input || "").trim();
  if (!q) return [];
  const scored = candidates
    .map((c) => {
      if (c === q) return { c, score: 100 };
      if (c.includes(q) || q.includes(c)) return { c, score: 50 };
      return { c, score: 0 };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((x) => x.c);
}

/**
 * 将用户输入的业务名称解析为 OA 合法选项
 */
function resolveBusinessName(input) {
  const opts = getOptions();
  const raw = String(input || "").trim();
  if (!raw) return { ok: false, reason: "empty" };

  if (opts.businessNameSet.has(raw)) {
    return { ok: true, value: raw, via: "exact" };
  }

  const aliasChain = opts.aliases[raw] || ALIAS_TO_OA[raw];
  if (aliasChain) {
    if (opts.businessNameSet.has(aliasChain)) {
      return { ok: true, value: aliasChain, via: "alias", from: raw };
    }
    if (opts.businessNameSet.has(aliasChain + "续费")) {
      return { ok: true, value: aliasChain + "续费", via: "alias" };
    }
  }

  const suggestions = suggestSimilar(raw, opts.businessNames);
  return { ok: false, reason: "invalid", input: raw, suggestions };
}

function resolveCustomerType(input) {
  const opts = getOptions();
  const raw = String(input || "").trim();
  if (!raw) return { ok: true, value: "" };
  if (opts.customerTypeSet.has(raw)) return { ok: true, value: raw };
  return {
    ok: false,
    reason: "invalid",
    field: "客户类型",
    input: raw,
    suggestions: opts.customerTypes,
  };
}

function resolveCompany(input) {
  const opts = getOptions();
  const raw = String(input || "").trim();
  if (!raw) return { ok: true, value: "" };
  if (opts.companySet.has(raw)) return { ok: true, value: raw };
  return {
    ok: false,
    reason: "invalid",
    field: "发起公司",
    input: raw,
    suggestions: opts.companies.slice(0, 8),
  };
}

/**
 * 校验并规范化订单字段（combo 选项）
 * @returns {{ ok: boolean, order?: object, errors?: string[] }}
 */
function validateAndNormalize(order) {
  const errors = [];
  const normalized = { ...order };

  const biz = resolveBusinessName(order.businessName);
  if (!biz.ok) {
    const hint =
      biz.suggestions?.length > 0
        ? `\n相近选项：${biz.suggestions.join("、")}`
        : "";
    errors.push(`业务名称「${order.businessName}」不在合法列表中${hint}`);
  } else if (biz.via === "alias") {
    normalized.businessName = biz.value;
  } else {
    normalized.businessName = biz.value;
  }

  const ct = resolveCustomerType(order.customerType);
  if (!ct.ok) {
    errors.push(
      `客户类型「${order.customerType}」无效，可选：${ct.suggestions.join("、")}`
    );
  } else {
    normalized.customerType = ct.value;
  }

  const co = resolveCompany(order.company);
  if (!co.ok) {
    errors.push(
      `发起公司「${order.company}」无效，可选：${co.suggestions.join("、")}…`
    );
  } else {
    normalized.company = co.value;
  }

  if (errors.length) return { ok: false, errors, order: normalized };
  return { ok: true, order: normalized };
}

function formatOptionsHelp() {
  const opts = getOptions();
  const common = opts.commonHints?.length
    ? opts.commonHints.join("、")
    : "（见业务名称列表）";
  const aliasLines = Object.entries(opts.aliases || {})
    .map(([k, v]) => `${k}→${v}`)
    .join("；");

  return (
    `**常用业务**：${common}\n\n` +
    (aliasLines ? `**口语别名**：${aliasLines}；代账/记账→代账续费\n\n` : "") +
    `**业务名称**须与 OA 完全一致（共 ${opts.businessNames.length} 项）。` +
    `客户类型：${opts.customerTypes.join("、")}。`
  );
}

module.exports = {
  validateAndNormalize,
  resolveBusinessName,
  formatOptionsHelp,
  suggestSimilar,
};
