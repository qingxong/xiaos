const WXBizMsgCrypt = require("./wxbizmsgcrypt");
const {
  WECOM_TOKEN,
  WECOM_ENCODING_AES_KEY,
  WECOM_CORP_ID,
} = require("../config");

let crypt;

function getCrypt() {
  if (!crypt) {
    if (!WECOM_TOKEN || !WECOM_ENCODING_AES_KEY) {
      throw new Error("WECOM_TOKEN 或 WECOM_ENCODING_AES_KEY 未配置");
    }
    crypt = new WXBizMsgCrypt(
      WECOM_TOKEN,
      WECOM_ENCODING_AES_KEY,
      WECOM_CORP_ID || ""
    );
  }
  return crypt;
}

function verifyUrl(msgSignature, timestamp, nonce, echostr) {
  return getCrypt().verifyURL(msgSignature, timestamp, nonce, echostr);
}

function decryptMessage(msgSignature, timestamp, nonce, body) {
  const { message, format } = getCrypt().decryptPostBody(
    msgSignature,
    timestamp,
    nonce,
    body
  );
  return { message, format };
}

module.exports = { verifyUrl, decryptMessage, getCrypt };
