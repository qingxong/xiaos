const express = require("express");
const { PORT, PUBLIC_BASE_URL, assertConfig } = require("./config");
const healthRouter = require("./routes/health");
const wecomRouter = require("./routes/wecom");

assertConfig();

const app = express();

app.use(healthRouter);
app.use("/wecom", wecomRouter);

app.use((err, _req, res, _next) => {
  console.error("[error]", err);
  res.status(500).json({ ok: false, message: err.message });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[tidan-bot] listening on http://0.0.0.0:${PORT}`);
  console.log(`[tidan-bot] health: http://127.0.0.1:${PORT}/health`);
  console.log(
    `[tidan-bot] wecom callback: ${PUBLIC_BASE_URL}/wecom/robot/callback`
  );
});
