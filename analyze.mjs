// analyze.js
// Node >=16，零依赖
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// === 可调参数 ===
const INPUT = path.join(__dirname, "data.json");
const TAG_TO_FILTER = process.argv[2] || "9/24";
const TZ = "Asia/Singapore";

// === 工具函数 ===
function toLocalDateString(iso) {
  // 返回 M/D 形式，如 9/24
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(d);
  const M = parts.find((p) => p.type === "month")?.value;
  const D = parts.find((p) => p.type === "day")?.value;
  return `${Number(M)}/${Number(D)}`;
}
function pickScore(x) {
  // 尽量从 evaluation.score 读取为 number
  const v = x?.evaluation?.score;
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function hasTag(x, tag) {
  // 优先看 x.tags 数组是否包含 tag；没有 tags 时返回 false
  if (Array.isArray(x?.tags)) return x.tags.map(String).includes(String(tag));
  return false;
}
function summarize(numbers) {
  const arr = numbers.filter((n) => Number.isFinite(n));
  const n = arr.length;
  if (!n) return { count: 0, mean: NaN, min: NaN, max: NaN, stdev: NaN };
  const sum = arr.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const min = Math.min(...arr);
  const max = Math.max(...arr);
  const variance = arr.reduce((a, b) => a + (b - mean) * (b - mean), 0) / n;
  const stdev = Math.sqrt(variance);
  return { count: n, mean, min, max, stdev };
}
function groupBy(list, keyFn) {
  const map = new Map();
  for (const item of list) {
    const k = keyFn(item);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(item);
  }
  return map;
}
function toTable(rows) {
  // rows: array of objects with same keys
  if (rows.length === 0) return "(no rows)\n";
  const headers = Object.keys(rows[0]);
  const cols = headers.map((h) => String(h));
  const widths = cols.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => String(r[headers[i]]).length))
  );
  const line = (arr) =>
    arr.map((v, i) => String(v).padEnd(widths[i])).join("  ");
  const sep = widths.map((w) => "-".repeat(w)).join("  ");
  const out = [];
  out.push(line(headers));
  out.push(sep);
  rows.forEach((r) => out.push(line(headers.map((h) => r[h]))));
  return out.join("\n") + "\n";
}
function writeCSV(rows, filePath) {
  if (!rows.length) {
    fs.writeFileSync(filePath, "");
    return;
  }
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((r) =>
      headers
        .map((h) => {
          const v = r[h];
          if (v == null) return "";
          const s = String(v);
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(",")
    ),
  ].join("\n");
  fs.writeFileSync(filePath, csv, "utf8");
}

// === 主流程 ===
function main() {
  if (!fs.existsSync(INPUT)) {
    console.error(`ERROR: ${INPUT} 不存在`);
    process.exit(1);
  }
  const raw = fs.readFileSync(INPUT, "utf8");
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error("ERROR: data.json 不是有效 JSON:", e.message);
    process.exit(1);
  }
  if (!Array.isArray(data)) {
    console.error("ERROR: data.json 需为数组");
    process.exit(1);
  }

  // 1) 先筛选：优先 tags 含 "9/24"；若没有 tags 字段，则退化为 timestamp 的新加坡本地日期是 9/24
  const filtered = data.filter((item) => {
    if (hasTag(item, TAG_TO_FILTER)) return true;
    // 没有/不含 tags 时，尝试按日期退化筛选
    return false;
  });

  // 2) 提取可用分数
  const withScore = filtered
    .map((x) => ({ ...x, __score: pickScore(x) }))
    .filter((x) => x.__score != null);

  // 3) 统计：按 model
  const byModel = groupBy(withScore, (x) => x.model || "(null)");
  const modelRows = [];
  for (const [model, items] of byModel.entries()) {
    const stats = summarize(items.map((x) => x.__score));
    modelRows.push({
      model,
      count: stats.count,
      mean: stats.mean.toFixed(3),
      min: stats.min,
      max: stats.max,
      stdev: stats.stdev.toFixed(3),
    });
  }
  // 4) 统计：按 question
  const byQuestion = groupBy(withScore, (x) => x.question || "(null)");
  const questionRows = [];
  for (const [question, items] of byQuestion.entries()) {
    const stats = summarize(items.map((x) => x.__score));
    questionRows.push({
      question,
      count: stats.count,
      mean: stats.mean.toFixed(3),
      min: stats.min,
      max: stats.max,
      stdev: stats.stdev.toFixed(3),
    });
  }

  // 5) 输出
  console.log(`筛选标签: "${TAG_TO_FILTER}"`);
  console.log(
    `匹配到记录数: ${filtered.length}，其中有评分的记录数: ${withScore.length}\n`
  );

  console.log("== 按 model 统计 ==");
  console.log(
    toTable(modelRows.sort((a, b) => a.model.localeCompare(b.model)))
  );

  console.log("== 按 question 统计 ==");
  console.log(
    toTable(questionRows.sort((a, b) => a.question.localeCompare(b.question)))
  );

  // 6) 导出 CSV
  const OUT1 = path.join(__dirname, "stats_by_model.csv");
  const OUT2 = path.join(__dirname, "stats_by_question.csv");
  writeCSV(modelRows, OUT1);
  writeCSV(questionRows, OUT2);
  console.log(`已导出: ${OUT1}`);
  console.log(`已导出: ${OUT2}`);
}

main();
