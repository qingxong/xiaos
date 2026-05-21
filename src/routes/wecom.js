const express = require("express");
const { verifyUrl, decryptMessage } = require("../wecom/crypto");
const { logPostBody } = require("../wecom/log");
const { parseIncomingMessage, handleMessage } = require("../wecom/handler");
const { sendActiveReply } = require("../wecom/reply");

const router = express.Router();

function querySignParams(query) {
  return {
    msg_signature: query.msg_signature || query.msgsignature,
    timestamp: query.timestamp,
    nonce: query.nonce,
  };
}

/**
 * 企业微信智能机器人 URL 回调
 * GET  - 保存配置时校验 URL
 * POST - 接收用户消息（外层 JSON: { encrypt, tousername }）
 */
router.get("/robot/callback", (req, res) => {
  const { msg_signature, timestamp, nonce, echostr } = req.query;

  if (!msg_signature || !timestamp || !nonce || !echostr) {
    return res.status(400).send("missing query params");
  }

  try {
    const plain = verifyUrl(msg_signature, timestamp, nonce, echostr);
    console.log("[wecom] URL 校验成功");
    return res.send(plain);
  } catch (err) {
    console.error("[wecom] URL 校验失败:", err.message);
    return res.status(403).send("verify failed");
  }
});

router.post(
  "/robot/callback",
  express.raw({ type: () => true, limit: "2mb" }),
  async (req, res) => {
    const { msg_signature, timestamp, nonce } = querySignParams(req.query);
    const body =
      req.body instanceof Buffer
        ? req.body.toString("utf8")
        : String(req.body || "");

    if (!msg_signature || !timestamp || !nonce) {
      return res.status(400).send("missing query params");
    }

    logPostBody(body);

    try {
      const { message: plain, format } = decryptMessage(
        msg_signature,
        timestamp,
        nonce,
        body
      );
      console.log(
        `[wecom] 解密成功 format=${format} plainLen=${plain.length}`
      );

      const parsed = parseIncomingMessage(plain);
      const plan = await handleMessage(parsed);

      if (plan.shouldReply && plan.responseUrl) {
        try {
          await sendActiveReply(plan.responseUrl, plan.replyText);
          console.log("[wecom] 主动回复成功");
        } catch (replyErr) {
          console.error("[wecom] 主动回复失败:", replyErr.message);
        }
      }

      return res.send("success");
    } catch (err) {
      console.error("[wecom] 处理消息失败:", err.message);
      return res.status(500).send("error");
    }
  }
);

module.exports = router;
