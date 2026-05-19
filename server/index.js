import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express from 'express';
import { getAccessToken, getAgentConfigTicket, getJsApiTicket, signJsSdk } from './wework-api.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');
const port = Number(process.env.PORT || 3000);

const corpId = process.env.CORP_ID || '';
const agentId = process.env.AGENT_ID || '';
const corpSecret = process.env.CORP_SECRET || '';

const app = express();

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    app: '智汇销售助手',
    corpid: corpId || null,
    agentId: agentId ? Number(agentId) : null,
    hasCorpSecret: Boolean(corpSecret),
    publicUrl: process.env.PUBLIC_URL || null,
  });
});

app.get('/api/jssdk-sign', async (req, res) => {
  const url = req.query.url;
  if (!url) {
    res.status(400).json({ ok: false, error: 'missing query: url' });
    return;
  }
  if (!corpId || !corpSecret || !agentId) {
    res.status(500).json({ ok: false, error: 'CORP_ID / CORP_SECRET / AGENT_ID 未配置' });
    return;
  }

  try {
    const accessToken = await getAccessToken(corpId, corpSecret);
    const corpTicket = await getJsApiTicket(accessToken);
    const agentTicket = await getAgentConfigTicket(accessToken);

    const corpSign = signJsSdk(corpTicket, url);
    const agentSign = signJsSdk(agentTicket, url);

    res.json({
      ok: true,
      corpid: corpId,
      agentid: Number(agentId),
      timestamp: corpSign.timestamp,
      nonceStr: corpSign.nonceStr,
      signature: corpSign.signature,
      agentTimestamp: agentSign.timestamp,
      agentNonceStr: agentSign.nonceStr,
      agentSignature: agentSign.signature,
    });
  } catch (err) {
    console.error('[jssdk-sign]', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.use(express.static(publicDir));

app.listen(port, () => {
  console.log(`[智汇销售助手] http://127.0.0.1:${port}`);
});
