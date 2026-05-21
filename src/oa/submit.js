const { createOrder } = require("./client");
const {
  isOrderIntent,
  parseOrderText,
  getMissingRequired,
  validateAndNormalize,
  HELP_TEXT,
} = require("./parse-order");

/**
 * 尝试从用户文本提单
 * @returns {{ handled: boolean, replyText: string }}
 */
async function trySubmitOrder(text) {
  const trimmed = String(text || "").trim();

  if (!isOrderIntent(trimmed)) {
    return {
      handled: false,
      replyText:
        `已收到。\n\n如需**自动提单**，请按下列格式发送（首行写「提单」）：\n\n${HELP_TEXT}`,
    };
  }

  const order = parseOrderText(trimmed);
  const missing = getMissingRequired(order);

  if (missing.length) {
    return {
      handled: true,
      replyText:
        `**缺少必填项**：${missing.join("、")}\n\n请补全后重新发送。\n\n${HELP_TEXT}`,
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
    return {
      handled: true,
      replyText:
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
        `\n请在 OA 系统中核对详情。`,
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

module.exports = { trySubmitOrder, HELP_TEXT };
