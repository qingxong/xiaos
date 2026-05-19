# 智汇销售助手 · 企业微信自建应用侧边栏 Demo

自建应用（非服务商）：用企业 `access_token` 换取 JS-SDK 票据并签名，在客户联系聊天侧边栏获取当前外部联系人 / 会话上下文。

## 接口

| 路径 | 说明 |
|------|------|
| `GET /` | 侧边栏 H5（`public/index.html`） |
| `GET /api/jssdk-sign?url=` | 返回 `wx.config` / `wx.agentConfig` 签名 |
| `GET /api/health` | 运行状态 |

## 环境变量（`.env`，勿提交 git）

| 变量 | 说明 |
|------|------|
| `CORP_ID` | 企业 ID |
| `AGENT_ID` | 自建应用 AgentId |
| `CORP_SECRET` | 应用 Secret |
| `PUBLIC_URL` | 对外 HTTPS 地址，如 `https://xiaos.hnzhcyy.cn` |
| `PORT` | Node 端口，默认 `3000` |

参数可参考仓库内 `准备参数` 文件，复制到 `.env` 即可。

## 本地开发

```bash
npm install
npm run dev
```

- 浏览器：`http://127.0.0.1:3000/`（仅看页面）
- JS-SDK 须在**企业微信客户端**内、从客户联系侧边栏打开
- 健康检查：`http://127.0.0.1:3000/api/health`

## 1Panel 部署

假设静态根目录：`/opt/1panel/www/sites/xiaos/index`，Node 监听 `127.0.0.1:3000`。

### 1. 部署代码

```bash
cd /opt/1panel/www/sites/xiaos/app   # 按实际路径
git clone <仓库> .
npm install --production
cp .env.example .env
# 编辑 .env 填入 CORP_ID / AGENT_ID / CORP_SECRET
```

### 2. 静态文件（可选）

```bash
cp public/index.html /opt/1panel/www/sites/xiaos/index/index.html
```

也可不单独拷贝，全部由 Node 提供静态资源（见下方整站反代）。

### 3. Nginx

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location / {
    try_files $uri $uri/ /index.html @node;
}

location @node {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### 4. PM2

```bash
pm2 start server/index.js --name zhihui-sales
pm2 save
```

### 企微后台配置（需自行完成）

1. 自建应用 → 网页授权及 JS-SDK：**可信域名** `xiaos.hnzhcyy.cn`
2. 客户联系 → 聊天工具栏 / 侧边栏 → 页面地址 `https://xiaos.hnzhcyy.cn/`
3. 应用可见范围包含测试成员

## 故障排查

| 现象 | 处理 |
|------|------|
| 签名 500 | 检查 `CORP_SECRET` 是否为该应用的 Secret |
| `wx.config 失败` | 签名 URL 须与当前页一致（不含 `#` 后内容） |
| 外部联系人 API 报错 | 确认从**客户联系会话**侧边栏打开，且应用已开通客户联系权限 |
