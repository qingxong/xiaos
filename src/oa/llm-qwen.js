const {
  DASHSCOPE_API_KEY,
  LLM_MODEL,
  LLM_ENABLED,
} = require("../config");
const { getOptions } = require("./load-options");

const CHAT_URL =
  "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";

const EMPTY_ORDER = {
  customerName: "",
  customerPhone: "",
  customerType: "",
  salesOwner: "",
  company: "",
  groupName: "",
  enterprise: "",
  businessName: "",
  businessIntent: "",
  taskRemark: "",
};

function buildSystemPrompt() {
  const opts = getOptions();
  const common = opts.commonHints?.join("、") || "注册公司、代理记账、银行开户、地址挂靠";
  const customerTypes = opts.customerTypes.join("、");
  const companiesSample = opts.companies.slice(0, 4).join("、");

  return `你是企业微信「提单助手」，从销售口语/聊天记录中提取 OA 提单字段。

规则：
1. 只输出一个 JSON 对象，不要 markdown 或其它说明。
2. 字段名固定：customerName, customerPhone, customerType, salesOwner, company, groupName, enterprise, businessName, businessIntent, taskRemark。
3. 没有的字段用空字符串 ""，不要编造电话或姓名。
4. customerPhone 仅填 11 位大陆手机号；可从原文识别。
5. businessIntent：用一句话概括客户要做的业务（口语即可，如「海口注册贸易公司」「代账续费」）。
6. businessName：若原文已出现接近 OA 的正式业务名可填入，否则留空，优先用 businessIntent 供系统匹配。
7. customerType 只能是：${customerTypes}，无法判断则 ""。
8. company（发起公司）须是下列之一，无法判断则 ""：${companiesSample} 等共 ${opts.companies.length} 家。
9. 常见业务口语参考：${common}（系统会将口语映射到 OA 正式名称，你无需列出全部业务）。

JSON 示例：
{"customerName":"张三","customerPhone":"13800138000","customerType":"直客","salesOwner":"","company":"","groupName":"","enterprise":"某某有限公司","businessName":"","businessIntent":"海口注册有限公司","taskRemark":""}`;
}

function extractJsonObject(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    /* continue */
  }

  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch {
      /* continue */
    }
  }

  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(raw.slice(start, end + 1));
    } catch {
      return null;
    }
  }
  return null;
}

function normalizeLlmFields(obj) {
  const out = { ...EMPTY_ORDER };
  if (!obj || typeof obj !== "object") return out;

  for (const key of Object.keys(EMPTY_ORDER)) {
    const v = obj[key];
    if (v === null || v === undefined) continue;
    out[key] = String(v).trim();
  }

  const phone = out.customerPhone.match(/1[3-9]\d{9}/);
  if (phone) out.customerPhone = phone[0];

  return out;
}

function isLlmAvailable() {
  return LLM_ENABLED && Boolean(DASHSCOPE_API_KEY);
}

/**
 * 是否像提单相关的自然语言（非键值对模板）
 */
function isNaturalLanguageOrder(text) {
  const t = String(text || "").trim();
  if (t.length < 6) return false;

  const hasPhone = /1[3-9]\d{9}/.test(t);
  const hasBizKeyword =
    /客户|公司|企业|注册|代账|记账|开户|地址|挂靠|法人|信用|注销|变更|续费|个体|有限公司|商标|税务|社保|公积金|许可证|转让/i.test(
      t
    );

  if (hasPhone && hasBizKeyword) return true;
  if (hasPhone && t.length >= 12) return true;
  if (/提单/.test(t) && t.length >= 10 && !/客户姓名\s*[:：]/.test(t)) return true;

  return hasBizKeyword && t.length >= 15;
}

/**
 * 调用通义千问解析口语为订单字段
 * @returns {Promise<{ ok: boolean, order?: object, error?: string }>}
 */
async function parseOrderWithLlm(text) {
  if (!isLlmAvailable()) {
    return { ok: false, error: "LLM 未启用或未配置 DASHSCOPE_API_KEY" };
  }

  const userText = String(text || "").trim();
  if (!userText) return { ok: false, error: "空消息" };

  const body = {
    model: LLM_MODEL,
    temperature: 0.1,
    messages: [
      { role: "system", content: buildSystemPrompt() },
      { role: "user", content: userText },
    ],
    response_format: { type: "json_object" },
  };

  const started = Date.now();
  let res;
  try {
    res = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DASHSCOPE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    });
  } catch (err) {
    console.error("[llm] 请求失败:", err.message);
    return { ok: false, error: `模型请求失败：${err.message}` };
  }

  const rawBody = await res.text();
  let data;
  try {
    data = JSON.parse(rawBody);
  } catch {
    console.error("[llm] 非 JSON 响应:", rawBody.slice(0, 300));
    return { ok: false, error: "模型返回格式异常" };
  }

  if (!res.ok) {
    const msg =
      data?.error?.message || data?.message || rawBody.slice(0, 200);
    console.error("[llm] API 错误:", res.status, msg);
    return { ok: false, error: `模型 API 错误(${res.status})：${msg}` };
  }

  const content = data?.choices?.[0]?.message?.content;
  const parsed = extractJsonObject(content);
  if (!parsed) {
    console.error("[llm] 无法解析 JSON:", String(content).slice(0, 300));
    return { ok: false, error: "模型未返回有效 JSON" };
  }

  const order = normalizeLlmFields(parsed);
  console.log("[llm] 解析完成", {
    ms: Date.now() - started,
    model: LLM_MODEL,
    customerName: order.customerName,
    businessIntent: order.businessIntent?.slice(0, 40),
  });

  return { ok: true, order };
}

module.exports = {
  parseOrderWithLlm,
  isLlmAvailable,
  isNaturalLanguageOrder,
  buildSystemPrompt,
};
