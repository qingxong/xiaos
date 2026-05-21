const fs = require("fs");
const path = require("path");

const OPTIONS_FILE = path.join(
  __dirname,
  "..",
  "..",
  "config",
  "oa-options.json"
);
const SOURCE_FILE = path.join(__dirname, "..", "..", "业务名称");

let cached = null;

function cleanLine(line) {
  return String(line || "")
    .trim()
    .replace(/^["']|["']$/g, "");
}

/**
 * 解析《业务名称》源文件
 */
function parseSourceFile(content) {
  const result = {
    businessNames: [],
    customerTypes: [],
    companies: [],
    aliases: {},
    commonHints: [],
    businessNameRequired: true,
  };

  let section = null;

  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;

    const secMatch = line.match(/^(\d+)、(.+?)[：:]\s*$/);
    if (secMatch) {
      section = secMatch[2];
      continue;
    }

    if (line.includes("提单时") && line.includes("业务名称") && line.includes("必填")) {
      result.businessNameRequired = true;
      continue;
    }

    if (section === "业务名称字段") {
      const name = cleanLine(line);
      if (!name || name === "业务简称") continue;
      result.businessNames.push(name);
      continue;
    }

    if (section === "客户类型字段") {
      const v = cleanLine(line);
      if (v) result.customerTypes.push(v);
      continue;
    }

    if (section === "发起公司字段") {
      const v = cleanLine(line);
      if (v) result.companies.push(v);
      continue;
    }

    if (section === "销售口语别名") {
      const m = line.match(/^(.+?)\s*[:：]\s*(.+)$/);
      if (m) {
        const from = m[1].trim();
        const to = m[2].trim();
        if (from && to) result.aliases[from] = to;
      }
      continue;
    }

    if (section === "最常见业务名称") {
      result.commonHints = line
        .split(/[、,，]/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }

  result.businessNames = [...new Set(result.businessNames)];
  result.customerTypes = [...new Set(result.customerTypes)];
  result.companies = [...new Set(result.companies)];

  return result;
}

function loadFromJson() {
  const raw = fs.readFileSync(OPTIONS_FILE, "utf8");
  return JSON.parse(raw);
}

function loadFromSource() {
  if (!fs.existsSync(SOURCE_FILE)) {
    throw new Error(`找不到选项源文件: ${SOURCE_FILE}`);
  }
  const content = fs.readFileSync(SOURCE_FILE, "utf8");
  return parseSourceFile(content);
}

function getOptions() {
  if (cached) return cached;

  if (fs.existsSync(OPTIONS_FILE)) {
    cached = loadFromJson();
  } else {
    cached = loadFromSource();
  }

  cached.businessNameSet = new Set(cached.businessNames);
  cached.customerTypeSet = new Set(cached.customerTypes);
  cached.companySet = new Set(cached.companies);

  return cached;
}

module.exports = {
  getOptions,
  parseSourceFile,
  OPTIONS_FILE,
  SOURCE_FILE,
};
