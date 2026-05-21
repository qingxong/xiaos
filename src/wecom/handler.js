const { shouldProcess } = require("./dedup");

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
  const re = new RegExp(
    `<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>|<${tag}>([^<]*)</${tag}>`
  );
  const m = xml.match(re);
  return m ? (m[1] !== undefined ? m[1] : m[2]) : "";
}

/**
 * 从智能机器人解密后的 JSON 中提取可读文本
 */
function extractTextFromJson(data) {
  if (!data || typeof data !== "object") return "";

  if (data.msgtype === "text") {
    if (data.text?.content) return data.text.content;
    if (typeof data.text === "string") return data.text;
  }

  if (data.msgtype === "mixed" && Array.isArray(data.mixed?.msg_item)) {
    const parts = data.mixed.msg_item
      .filter((i) => i.msgtype === "text" && i.text?.content)
      .map((i) => i.text.content);
    if (parts.length) return parts.join("\n");
  }

  if (data.msgtype === "voice" && data.voice?.content) {
    return data.voice.content;
  }

  if (data.msgtype === "event" && data.event?.eventtype === "enter_chat") {
    return "";
  }

  if (data.msgtype === "event" && data.event) {
    return `[事件] ${data.event.eventtype || JSON.stringify(data.event)}`;
  }

  if (data.content) return data.content;
  return "";
}

function buildReplyPlan(parsed) {
  const data = parsed.type === "json" ? parsed.data : null;
  if (!data) {
    return { shouldReply: false, reason: "非 JSON 回调" };
  }

  const msgid = data.msgid;
  if (!shouldProcess(msgid)) {
    return { shouldReply: false, reason: "重复 msgid" };
  }

  const responseUrl = data.response_url;
  if (!responseUrl) {
    return { shouldReply: false, reason: "无 response_url" };
  }

  if (data.msgtype === "stream") {
    return { shouldReply: false, reason: "流式刷新" };
  }

  if (data.msgtype === "event") {
    if (data.event?.eventtype === "feedback_event") {
      return { shouldReply: false, reason: "用户反馈事件" };
    }
    if (data.event?.eventtype === "enter_chat") {
      return {
        shouldReply: true,
        responseUrl,
        replyText:
          "您好，我是**智汇提单助手**。\n\n请直接发送客户情况或提单说明（例如：客户姓名、电话、业务类型），我会协助您整理并提交 OA 提单。",
      };
    }
    return { shouldReply: false, reason: `事件 ${data.event?.eventtype}` };
  }

  const preview = extractTextFromJson(data) || "(无文本)";
  const fromUser = data.from?.userid || "";

  return {
    shouldReply: true,
    responseUrl,
    replyText:
      `已收到您的消息。\n\n` +
      `> ${String(preview).slice(0, 500).replace(/\n/g, "\n> ")}\n\n` +
      (fromUser ? `（来自：${fromUser}）\n\n` : "") +
      `提单功能开发中，后续将支持对话自动写入 OA。`,
    preview,
    fromUser,
    msgid,
    msgtype: data.msgtype,
  };
}

/**
 * 处理用户消息（后续接 LLM + OA）
 */
async function handleMessage(parsed) {
  const plan = buildReplyPlan(parsed);

  if (!plan.shouldReply) {
    console.log("[wecom] 跳过回复:", plan.reason);
    return plan;
  }

  console.log("[wecom] 收到消息:", {
    msgid: plan.msgid,
    msgtype: plan.msgtype,
    from: plan.fromUser,
    preview: String(plan.preview || "").slice(0, 500),
  });

  return plan;
}

module.exports = { parseIncomingMessage, handleMessage, extractTextFromJson };
