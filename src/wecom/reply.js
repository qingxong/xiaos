/**
 * 智能机器人主动回复（response_url）
 * @see https://developer.work.weixin.qq.com/document/path/101138
 */

/**
 * @param {string} responseUrl 回调消息中的 response_url（1 小时内有效，仅可调用一次）
 * @param {string} text 回复正文（markdown）
 */
async function sendActiveReply(responseUrl, text) {
  if (!responseUrl) {
    throw new Error("缺少 response_url");
  }

  const content = String(text || "").trim() || "已收到。";
  const body = {
    msgtype: "markdown",
    markdown: {
      content,
    },
  };

  const res = await fetch(responseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });

  const respText = await res.text();
  if (!res.ok) {
    throw new Error(
      `主动回复 HTTP ${res.status}: ${respText.slice(0, 300)}`
    );
  }

  return { status: res.status, body: respText };
}

module.exports = { sendActiveReply };
