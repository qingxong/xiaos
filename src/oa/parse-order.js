/**
 * 解析企微文本为提单字段
 */
const { validateAndNormalize, formatOptionsHelp } = require("./validate");

const KEY_ALIASES = {
  客户姓名: "customerName",
  客户电话: "customerPhone",
  客户类型: "customerType",
  销售负责人: "salesOwner",
  发起公司: "company",
  群名称: "groupName",
  标的企业: "enterprise",
  业务名称: "businessName",
  备注: "taskRemark",
};

/** 键值对模板提单（不走 LLM） */
function isTemplateOrderIntent(text) {
  const t = String(text || "").trim();
  if (!t) return false;
  return (
    /^提单\b/m.test(t) ||
    /^\/提单\b/m.test(t) ||
    /客户姓名\s*[:：]/.test(t)
  );
}

/** @deprecated 使用 isTemplateOrderIntent */
function isOrderIntent(text) {
  return isTemplateOrderIntent(text);
}

function parseOrderText(text) {
  const order = {
    customerName: "",
    customerPhone: "",
    customerType: "",
    salesOwner: "",
    company: "",
    groupName: "",
    enterprise: "",
    businessName: "",
    taskRemark: "",
  };

  const lines = String(text || "").split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^(.+?)\s*[:：]\s*(.+)$/);
    if (!m) continue;
    const key = m[1].trim().replace(/\s+/g, "");
    const value = m[2].trim();
    const field = KEY_ALIASES[key];
    if (field && value) order[field] = value;
  }

  const phoneMatch = text.match(/1[3-9]\d{9}/);
  if (phoneMatch && !order.customerPhone) {
    order.customerPhone = phoneMatch[0];
  }

  return order;
}

function getMissingRequired(order) {
  const { REQUIRED_LABELS } = require("./fields");
  const missing = [];
  for (const [key, label] of REQUIRED_LABELS) {
    if (!String(order[key] || "").trim()) missing.push(label);
  }
  return missing;
}

function buildHelpText() {
  return (
    `**提单格式**（每行一项）：\n\n` +
    `\`\`\`\n提单\n客户姓名：张三\n客户电话：13800138000\n标的企业：某某有限公司\n业务名称：海口有限公司注册\n客户类型：直客\n发起公司：海南智汇创业园有限公司\n\`\`\`\n\n` +
    formatOptionsHelp()
  );
}

const HELP_TEXT = buildHelpText();

module.exports = {
  isOrderIntent,
  isTemplateOrderIntent,
  parseOrderText,
  getMissingRequired,
  validateAndNormalize,
  HELP_TEXT,
  buildHelpText,
};
