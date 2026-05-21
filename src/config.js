require("dotenv").config();

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_BASE_URL = (
  process.env.PUBLIC_BASE_URL || "https://xiaos.hnzhcyy.cn"
).replace(/\/$/, "");

const WECOM_TOKEN = process.env.WECOM_TOKEN || "";
const WECOM_ENCODING_AES_KEY = process.env.WECOM_ENCODING_AES_KEY || "";
const WECOM_CORP_ID = process.env.WECOM_CORP_ID || "";

function assertConfig() {
  const missing = [];
  if (!WECOM_TOKEN) missing.push("WECOM_TOKEN");
  if (!WECOM_ENCODING_AES_KEY) missing.push("WECOM_ENCODING_AES_KEY");
  if (missing.length) {
    console.warn(
      `[warn] 缺少环境变量: ${missing.join(", ")} — 企微 URL 校验将无法通过`
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
  assertConfig,
};
