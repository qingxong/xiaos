/**
 * 解析企微文本为提单字段（最小格式，后续可换 LLM）
 *
 * 示例：
 * 提单
 * 客户姓名：张三
 * 客户电话：13800138000
 * 标的企业：某某公司
 * 业务名称：注册
 */

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

function isOrderIntent(text) {
  const t = String(text || "").trim();
  if (!t) return false;
  return (
    /^提单\b/m.test(t) ||
    /^\/提单\b/m.test(t) ||
    /客户姓名\s*[:：]/.test(t)
  );
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

  // 兜底：首行「提单」后若只有一行口语，尝试提取手机号
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

const HELP_TEXT = `**提单格式**（每行一项，复制后修改发送）：

\`\`\`
提单
客户姓名：张三
客户电话：13800138000
标的企业：某某有限公司
业务名称：（与OA下拉选项完全一致）
群名称：选填
客户类型：选填
发起公司：选填
销售负责人：选填（OA成员ID）
\`\`\`

发送后以「提单」开头的消息会自动写入 OA。`;

module.exports = {
  isOrderIntent,
  parseOrderText,
  getMissingRequired,
  HELP_TEXT,
};
