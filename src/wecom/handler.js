/**
 * 解析解密后的消息（XML 或 JSON 文本），返回简要结构
 */
function parseIncomingMessage(plain) {
  const text = String(plain || "").trim();
  if (!text) return { raw: "", type: "empty" };

  if (text.startsWith("{")) {
    try {
      return { type: "json", data: JSON.parse(text), raw: text };
    } catch {
      return { type: "text", raw: text };
    }
  }

  const msgType = matchXml(text, "MsgType");
  const content = matchXml(text, "Content");
  const fromUser = matchXml(text, "FromUserName") || matchXml(text, "FromUserid");

  return {
    type: "xml",
    msgType,
    content,
    fromUser,
    raw: text,
  };
}

function matchXml(xml, tag) {
  const re = new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>|<${tag}>([^<]*)</${tag}>`);
  const m = xml.match(re);
  return m ? (m[1] !== undefined ? m[1] : m[2]) : "";
}

/**
 * 处理用户消息（后续接 LLM + OA）
 */
async function handleMessage(parsed) {
  const preview =
    parsed.content ||
    (parsed.data && (parsed.data.text || parsed.data.content)) ||
    parsed.raw?.slice(0, 200) ||
    "(无文本)";

  console.log("[wecom] 收到消息:", {
    type: parsed.type,
    msgType: parsed.msgType,
    from: parsed.fromUser,
    preview: String(preview).slice(0, 500),
  });

  return {
    replyText:
      "已收到。提单机器人正在开发中，后续将支持对话自动提单。\n\n" +
      `您说：${String(preview).slice(0, 200)}`,
  };
}

module.exports = { parseIncomingMessage, handleMessage };
