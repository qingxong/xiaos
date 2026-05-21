/**
 * 企业微信回调加解密（精简版，支持 ReceiveId 为空）
 * @see https://developer.work.weixin.qq.com/document/path/90968
 */
const crypto = require("crypto");

const PKCS7Encoder = {
  decode(text) {
    let pad = text[text.length - 1];
    if (pad < 1 || pad > 32) pad = 0;
    return text.slice(0, text.length - pad);
  },
  encode(text) {
    const blockSize = 32;
    const amountToPad = blockSize - (text.length % blockSize);
    const pad = Buffer.alloc(amountToPad, amountToPad);
    return Buffer.concat([text, pad]);
  },
};

class WXBizMsgCrypt {
  constructor(token, encodingAESKey, receiveId = "") {
    if (!token || !encodingAESKey) {
      throw new Error("token 或 encodingAESKey 无效");
    }
    this.token = token;
    this.receiveId = receiveId || "";
    const AESKey = Buffer.from(encodingAESKey + "=", "base64");
    if (AESKey.length !== 32) {
      throw new Error("encodingAESKey 无效");
    }
    this.key = AESKey;
    this.iv = AESKey.slice(0, 16);
  }

  getSignature(timestamp, nonce, encrypt) {
    const arr = [this.token, timestamp, nonce, encrypt].sort().join("");
    return crypto.createHash("sha1").update(arr).digest("hex");
  }

  decrypt(encrypt) {
    const decipher = crypto.createDecipheriv("aes-256-cbc", this.key, this.iv);
    decipher.setAutoPadding(false);
    const deciphered = PKCS7Encoder.decode(
      Buffer.concat([decipher.update(encrypt, "base64"), decipher.final()])
    );
    const content = deciphered.slice(16);
    const length = content.slice(0, 4).readUInt32BE(0);
    const message = content.slice(4, length + 4).toString();
    const id = content.slice(length + 4).toString();
    return { message, id };
  }

  verifyURL(msgSignature, timestamp, nonce, echostr) {
    const signature = this.getSignature(timestamp, nonce, echostr);
    if (signature !== msgSignature) {
      throw new Error("签名校验失败");
    }
    const { message, id } = this.decrypt(echostr);
    if (this.receiveId && id && id !== this.receiveId) {
      throw new Error("ReceiveId 不匹配");
    }
    return message;
  }

  /**
   * 解密 POST 回调（支持智能机器人 JSON 与旧版 XML）
   * JSON: { "tousername": "...", "encrypt": "..." }
   */
  decryptPostBody(msgSignature, timestamp, nonce, body) {
    const { encrypt, format } = extractEncryptPayload(body);
    const signature = this.getSignature(timestamp, nonce, encrypt);
    if (signature !== msgSignature) {
      throw new Error("签名校验失败");
    }
    const { message, id } = this.decrypt(encrypt);
    if (this.receiveId && id && id !== this.receiveId) {
      throw new Error("ReceiveId 不匹配");
    }
    return { message, format };
  }

  /** @deprecated 使用 decryptPostBody */
  decryptMsg(msgSignature, timestamp, nonce, body) {
    return this.decryptPostBody(msgSignature, timestamp, nonce, body).message;
  }
}

/**
 * @returns {{ encrypt: string, format: 'json'|'xml' }}
 */
function extractEncryptPayload(body) {
  const trimmed = String(body || "").trim();
  if (!trimmed) {
    throw new Error("空消息体");
  }

  if (trimmed.startsWith("{")) {
    try {
      const obj = JSON.parse(trimmed);
      const enc = obj.encrypt ?? obj.Encrypt;
      if (typeof enc === "string" && enc.length > 0) {
        return { encrypt: enc, format: "json" };
      }
    } catch {
      /* 非合法 JSON，继续尝试 XML */
    }
  }

  const cdata = trimmed.match(
    /<Encrypt><!\[CDATA\[([\s\S]*?)\]\]><\/Encrypt>/i
  );
  if (cdata) return { encrypt: cdata[1], format: "xml" };

  const plain = trimmed.match(/<Encrypt>([^<]*)<\/Encrypt>/i);
  if (plain) return { encrypt: plain[1], format: "xml" };

  throw new Error("未找到 encrypt 字段（支持 JSON.encrypt 或 XML Encrypt）");
}

module.exports = WXBizMsgCrypt;
module.exports.extractEncryptPayload = extractEncryptPayload;
