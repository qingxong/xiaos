/**
 * 记录 POST 原始 body 类型与摘要（便于 1Panel 日志排查，不打印完整密文）
 */
function detectBodyKind(body) {
  const trimmed = String(body || "").trim();
  if (!trimmed) return "empty";
  if (trimmed.startsWith("{")) return "json";
  if (trimmed.startsWith("<")) return "xml";
  return "text";
}

function logPostBody(body) {
  const kind = detectBodyKind(body);
  const len = Buffer.byteLength(String(body || ""), "utf8");
  const preview = String(body || "")
    .trim()
    .slice(0, 320)
    .replace(/\s+/g, " ");
  console.log(
    `[wecom] POST body kind=${kind} len=${len} preview=${preview || "(empty)"}`
  );
  return kind;
}

module.exports = { logPostBody, detectBodyKind };
