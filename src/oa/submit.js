const { createOrder } = require("./client");
const {
  isOrderIntent,
  parseOrderText,
  getMissingRequired,
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

  try {
    const result = await createOrder(order);
    return {
      handled: true,
      replyText:
        `**提单成功**\n\n` +
        `- 订单ID：\`${result.orderId || "（见OA）"}\`\n` +
        `- 客户：${order.customerName}\n` +
        `- 电话：${order.customerPhone}\n` +
        `- 标的企业：${order.enterprise}\n` +
        `- 业务：${order.businessName}\n\n` +
        `请在 OA 系统中核对详情。`,
      orderId: result.orderId,
    };
  } catch (err) {
    console.error("[oa] 提单失败:", err.message);
    return {
      handled: true,
      replyText:
        `**提单失败**\n\n${err.message}\n\n请检查下拉选项是否与 OA 完全一致，或联系管理员查看日志。`,
    };
  }
}

module.exports = { trySubmitOrder, HELP_TEXT };
