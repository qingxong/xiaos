import crypto from 'node:crypto';

const API_BASE = 'https://qyapi.weixin.qq.com';
const cache = new Map();

function getCache(key) {
  const item = cache.get(key);
  if (!item || Date.now() >= item.expiresAt) {
    cache.delete(key);
    return null;
  }
  return item.value;
}

function setCache(key, value, ttlSeconds) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

async function getJson(url) {
  const res = await fetch(url);
  const data = await res.json();
  if (data.errcode && data.errcode !== 0) {
    throw new Error(`[${data.errcode}] ${data.errmsg}`);
  }
  return data;
}

export async function getAccessToken(corpId, corpSecret) {
  const cacheKey = `token:${corpId}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const data = await getJson(
    `${API_BASE}/cgi-bin/gettoken?corpid=${encodeURIComponent(corpId)}&corpsecret=${encodeURIComponent(corpSecret)}`,
  );

  setCache(cacheKey, data.access_token, Math.max(60, data.expires_in - 300));
  return data.access_token;
}

/** wx.config：企业 jsapi_ticket */
export async function getJsApiTicket(accessToken) {
  const cacheKey = `jsapi_ticket:${accessToken.slice(0, 12)}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const data = await getJson(
    `${API_BASE}/cgi-bin/get_jsapi_ticket?access_token=${accessToken}`,
  );

  setCache(cacheKey, data.ticket, Math.max(60, data.expires_in - 300));
  return data.ticket;
}

/** wx.agentConfig：应用 agent_config ticket */
export async function getAgentConfigTicket(accessToken) {
  const cacheKey = `agent_config:${accessToken.slice(0, 12)}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const data = await getJson(
    `${API_BASE}/cgi-bin/ticket/get?access_token=${accessToken}&type=agent_config`,
  );

  setCache(cacheKey, data.ticket, Math.max(60, data.expires_in - 300));
  return data.ticket;
}

export function signJsSdk(ticket, url) {
  const nonceStr = crypto.randomBytes(8).toString('hex');
  const timestamp = Math.floor(Date.now() / 1000);
  const raw = `jsapi_ticket=${ticket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${url}`;
  const signature = crypto.createHash('sha1').update(raw).digest('hex');
  return { timestamp, nonceStr, signature };
}
