const express = require("express");
const { PUBLIC_BASE_URL } = require("../config");

const router = express.Router();

router.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "xiaos-tidan-bot",
    callback: `${PUBLIC_BASE_URL}/wecom/robot/callback`,
  });
});

router.get("/", (_req, res) => {
  res.json({
    ok: true,
    message: "提单机器人服务运行中",
    health: "/health",
    wecomCallback: "/wecom/robot/callback",
  });
});

module.exports = router;
