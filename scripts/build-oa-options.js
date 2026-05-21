/**
 * 从《业务名称》生成 config/oa-options.json
 * 运行: node scripts/build-oa-options.js
 */
const fs = require("fs");
const path = require("path");
const { parseSourceFile, SOURCE_FILE } = require("../src/oa/load-options");

const out = path.join(__dirname, "..", "config", "oa-options.json");

const content = fs.readFileSync(SOURCE_FILE, "utf8");
const data = parseSourceFile(content);

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(data, null, 2), "utf8");

console.log(
  `已写入 ${out}：业务名称 ${data.businessNames.length} 项，客户类型 ${data.customerTypes.length} 项，发起公司 ${data.companies.length} 项`
);
