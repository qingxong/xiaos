const { API_KEY } = require("../config");
const { buildOaData } = require("./build-payload");

const OA_API_BASE = (
  process.env.OA_API_BASE || "https://wx.hnzhcyy.cn"
).replace(/\/$/, "");
const OA_APP_ID =
  process.env.OA_APP_ID || "505340306be546d79a51dbc0";
const OA_ENTRY_ID =
  process.env.OA_ENTRY_ID || "5c6f82ba000746576e209685";

function getDefaults() {
  return {
    customerType: process.env.OA_DEFAULT_CUSTOMER_TYPE || "",
    company: process.env.OA_DEFAULT_COMPANY || "",
    salesOwner: process.env.OA_DEFAULT_SALES_USER_ID || "",
  };
}

function dataCreateUrl() {
  return `${OA_API_BASE}/openapi/v1/app/${OA_APP_ID}/entry/${OA_ENTRY_ID}/data_create`;
}

/**
 * @param {object} order 解析后的订单字段
 * @param {{ operator?: string }} options
 */
async function createOrder(order, options = {}) {
  if (!API_KEY) {
    throw new Error("未配置 API_KEY");
  }

  const data = buildOaData(order, getDefaults());
  const body = {
    data,
    is_start_workflow:
      String(process.env.OA_START_WORKFLOW || "false").toLowerCase() ===
      "true",
    is_start_event: false,
  };

  if (options.operator) body.operator = options.operator;

  const res = await fetch(dataCreateUrl(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    const msg =
      json.message || json.msg || text.slice(0, 300) || `HTTP ${res.status}`;
    const code = json.code != null ? ` (${json.code})` : "";
    throw new Error(`OA 提单失败${code}: ${msg}`);
  }

  const record = json.data || json;
  const orderId = record._id || record.data?._id;

  console.log("[oa] data_create 成功", { orderId });

  return {
    orderId,
    data: record,
    requestData: data,
  };
}

module.exports = { createOrder, dataCreateUrl, buildOaData, getDefaults };
