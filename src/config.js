require("dotenv").config();

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_BASE_URL = (
  process.env.PUBLIC_BASE_URL || "https://xiaos.hnzhcyy.cn"
).replace(/\/$/, "");

const WECOM_TOKEN = process.env.WECOM_TOKEN || "";
const WECOM_ENCODING_AES_KEY = process.env.WECOM_ENCODING_AES_KEY || "";
const WECOM_CORP_ID = process.env.WECOM_CORP_ID || "";

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY || "";
const LLM_MODEL = process.env.LLM_MODEL || "qwen-turbo";
const LLM_ENABLED =
  String(process.env.LLM_ENABLED || "false").toLowerCase() === "true";

function assertConfig() {
  const missing = [];
  if (!WECOM_TOKEN) missing.push("WECOM_TOKEN");
  if (!WECOM_ENCODING_AES_KEY) missing.push("WECOM_ENCODING_AES_KEY");
  if (missing.length) {
    console.warn(
      `[warn] 缺少环境变量: ${missing.join(", ")} — 企微 URL 校验将无法通过`
    );
  }
  if (!process.env.API_KEY) {
    console.warn("[warn] 缺少 API_KEY — OA 提单不可用");
  }
  if (LLM_ENABLED && !DASHSCOPE_API_KEY) {
    console.warn(
      "[warn] LLM_ENABLED=true 但未配置 DASHSCOPE_API_KEY — 口语提单将不可用"
    );
  }
}

module.exports = {
  PORT,
  PUBLIC_BASE_URL,
  WECOM_TOKEN,
  WECOM_ENCODING_AES_KEY,
  WECOM_CORP_ID,
  API_KEY: process.env.API_KEY || "",
  DASHSCOPE_API_KEY,
  LLM_MODEL,
  LLM_ENABLED,
  assertConfig,
};
