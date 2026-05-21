const { createOrder } = require("./client");
const {
  isTemplateOrderIntent,
  parseOrderText,
  getMissingRequired,
  validateAndNormalize,
  HELP_TEXT,
} = require("./parse-order");
const { isLlmAvailable, isNaturalLanguageOrder, parseOrderWithLlm } = require("./llm-qwen");
const { applyBusinessMatch } = require("./match-business");

function formatSuccessReply(normalized, result) {
  return (
    `**提单成功**\n\n` +
    `- 订单ID：\`${result.orderId || "（见OA）"}\`\n` +
    `- 客户：${normalized.customerName}\n` +
    `- 电话：${normalized.customerPhone}\n` +
    `- 标的企业：${normalized.enterprise}\n` +
    `- 业务：${normalized.businessName}\n` +
    (normalized.customerType
      ? `- 客户类型：${normalized.customerType}\n`
      : "") +
    (normalized.company ? `- 发起公司：${normalized.company}\n` : "") +
    `\n请在 OA 系统中核对详情。`
  );
}

/**
 * 校验并提交（模板 / LLM 共用）
 */
async function submitParsedOrder(order, meta = {}) {
  const missing = getMissingRequired(order);
  if (missing.length) {
    const via = meta.source === "llm" ? "AI 解析" : "模板解析";
    return {
      handled: true,
      replyText:
        `**缺少必填项**（${via}）：${missing.join("、")}\n\n请补全后重新发送。\n\n${HELP_TEXT}`,
    };
  }

  const validated = validateAndNormalize(order);
  if (!validated.ok) {
    return {
      handled: true,
      replyText:
        `**选项校验未通过**\n\n${validated.errors.map((e) => `- ${e}`).join("\n")}\n\n${HELP_TEXT}`,
    };
  }

  const normalized = validated.order;

  try {
    const result = await createOrder(normalized);
    const prefix =
      meta.source === "llm" ? "（已通过通义千问解析口语）\n\n" : "";
    return {
      handled: true,
      replyText: prefix + formatSuccessReply(normalized, result),
      orderId: result.orderId,
    };
  } catch (err) {
    console.error("[oa] 提单失败:", err.message);
    return {
      handled: true,
      replyText:
        `**提单失败**\n\n${err.message}\n\n若选项已校验通过仍失败，请联系管理员查看 OA 日志。`,
    };
  }
}

async function tryLlmOrder(text) {
  const llm = await parseOrderWithLlm(text);
  if (!llm.ok) {
    return {
      handled: true,
      replyText:
        `**AI 解析失败**\n\n${llm.error}\n\n请改用模板格式提单：\n\n${HELP_TEXT}`,
    };
  }

  const biz = applyBusinessMatch(llm.order);
  const order = biz.order;

  if (!biz.ok) {
    const hint = biz.match.suggestions?.length
      ? `\n\n相近业务：${biz.match.suggestions.join("、")}`
      : "";
    return {
      handled: true,
      replyText:
        `**未能匹配 OA 业务名称**\n\n` +
        `AI 理解的业务：${biz.match.from || "（无）"}${hint}\n\n` +
        `请改用模板并填写准确「业务名称」，或补充更具体的业务描述。\n\n${HELP_TEXT}`,
    };
  }

  if (biz.match.via === "fuzzy" || biz.match.via === "alias") {
    console.log("[oa] 业务匹配:", {
      via: biz.match.via,
      from: biz.match.from,
      to: order.businessName,
    });
  }

  return submitParsedOrder(order, { source: "llm" });
}

/**
 * 尝试从用户文本提单
 * @returns {{ handled: boolean, replyText: string }}
 */
async function trySubmitOrder(text) {
  const trimmed = String(text || "").trim();

  if (isTemplateOrderIntent(trimmed)) {
    const order = parseOrderText(trimmed);
    return submitParsedOrder(order, { source: "template" });
  }

  if (isLlmAvailable() && isNaturalLanguageOrder(trimmed)) {
    return tryLlmOrder(trimmed);
  }

  if (!trimmed) {
    return { handled: false, replyText: "" };
  }

  const llmHint = isLlmAvailable()
    ? `也可直接发送**口语描述**（含客户、企业、业务意向），我将用 AI 解析后提单。\n\n`
    : "";

  return {
    handled: false,
    replyText:
      `已收到。\n\n${llmHint}如需**自动提单**，请按下列格式发送（首行写「提单」）：\n\n${HELP_TEXT}`,
  };
}

module.exports = { trySubmitOrder, HELP_TEXT, submitParsedOrder };
