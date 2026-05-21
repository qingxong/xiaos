const express = require("express");
const { verifyUrl, decryptMessage } = require("../wecom/crypto");
const { parseIncomingMessage, handleMessage } = require("../wecom/handler");

const router = express.Router();

/**
 * 企业微信智能机器人 URL 回调
 * GET  - 保存配置时校验 URL
 * POST - 接收用户消息
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
    const { msg_signature, timestamp, nonce } = req.query;
    const body =
      req.body instanceof Buffer
        ? req.body.toString("utf8")
        : String(req.body || "");

    if (!msg_signature || !timestamp || !nonce) {
      return res.status(400).send("missing query params");
    }

    try {
      let plain = body;
      if (body.includes("<Encrypt>") || body.includes('"encrypt"')) {
        plain = decryptMessage(msg_signature, timestamp, nonce, body);
      }

      const parsed = parseIncomingMessage(plain);
      await handleMessage(parsed);

      // 智能机器人多数场景回 success 即可；被动回复需按官方文档加密回包（后续扩展）
      return res.send("success");
    } catch (err) {
      console.error("[wecom] 处理消息失败:", err.message);
      return res.status(500).send("error");
    }
  }
);

module.exports = router;
