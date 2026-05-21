# 提单机器人（企微回调最小服务）

企业微信智能机器人 URL 回调 + 健康检查。部署目录：`/opt/1panel/www/xiaos`。

## 本地运行

```bash
npm install
npm start
```

```bash
curl http://127.0.0.1:3000/health
```

## 部署到 1Panel（运行环境 + 反向代理）

### 1. 上传

将本项目**全部文件**（含 `package.json`、`src/`、`.env`）上传到服务器：

```text
/opt/1panel/www/xiaos/
```

### 2. 运行环境

| 配置项 | 值 |
|--------|-----|
| 项目目录 | `/opt/1panel/www/xiaos` |
| 启动命令 | `start` |
| 端口 | `3000` |

点击 **安装依赖** → **启动**。

### 3. 网站反代（应已配置）

- 域名：`xiaos.hnzhcyy.cn`
- 代理：`http://127.0.0.1:3000`

### 4. 企微机器人

| 项 | 值 |
|----|-----|
| URL | `https://xiaos.hnzhcyy.cn/wecom/robot/callback` |
| Token | 与 `.env` 中 `WECOM_TOKEN` 一致 |
| EncodingAESKey | 与 `.env` 中 `WECOM_ENCODING_AES_KEY` 一致 |

### 5. 验证

```bash
curl -i https://xiaos.hnzhcyy.cn/health
curl -i "https://xiaos.hnzhcyy.cn/wecom/robot/callback"
```

保存机器人前，GET 回调在无参数时可能返回 400，属正常；企微带参校验时会返回 `echostr` 明文。

POST 回调支持智能机器人 **JSON** 格式：`{"tousername":"...","encrypt":"..."}`，日志会打印 `POST body kind=json` 与 `解密成功 format=json`。

收到用户消息后，使用回调里的 **`response_url`** 主动回复 markdown（日志：`主动回复成功`）。`response_url` 仅可使用一次、有效期约 1 小时。

## OA 最小提单

消息以「提单」开头或包含 `客户姓名：` 时，解析字段并调用 `data_create`：

```
提单
客户姓名：张三
客户电话：13800138000
标的企业：某某有限公司
业务名称：（须与 OA 下拉选项完全一致）
```

环境变量：`API_KEY`（必填），可选 `OA_DEFAULT_*`、`OA_START_WORKFLOW`。

## 环境变量

见 `.env.example`。必填：`WECOM_TOKEN`、`WECOM_ENCODING_AES_KEY`。可选：`WECOM_CORP_ID`（企业 ID；若 URL 校验仍失败，在企微管理后台查看企业 ID 填入）。

## 后续扩展

- `src/wecom/handler.js`：接入 LLM 解析
- 新建 `src/oa/client.js`：调用 OA `data_create`（见《提单的API文档》）
