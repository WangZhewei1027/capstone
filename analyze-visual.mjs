import fs from "fs/promises";
import path from "path";
import OpenAI from "openai";
import "dotenv/config";

// 配置
const VISUALS_DIR = path.resolve("./workspace/vlm-test/visuals");
const MODEL = "gpt-4o-mini";
// const API_KEY = process.env.NEWAPI_API_KEY;
// const API_BASE = process.env.NEWAPI_BASE_URL || undefined; // 可选

// if (!API_KEY) {
//   console.error("环境变量 NEWAPI_API_KEY 未设置。请先设置你的API Key。");
//   process.exit(1);
// }

// 使用 OpenAI 客户端（和 add-core.mjs 的风格一致）
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

// 1. 获取第一个 subfolder 和 initial_state.png
async function getFirstScreenshot() {
  const subfolders = await fs.readdir(VISUALS_DIR, { withFileTypes: true });
  const firstFolder = subfolders.find((d) => d.isDirectory());
  if (!firstFolder) throw new Error("No subfolder found in visuals/");
  const screenshotPath = path.join(
    VISUALS_DIR,
    "491972f0-b3c1-11f0-9577-1b326fe6059a",
    "initial_state.png"
  );
  return screenshotPath;
}

// 2. 读取图片并转换为 base64 数据URI（API 接受 image_url 或 data URI）
async function readImageAsDataURI(filePath) {
  const data = await fs.readFile(filePath);
  return `data:image/png;base64,${data.toString("base64")}`;
}

// 3. 使用 client 调用 responses API（与 add-core.mjs 的调用风格一致）
async function analyzeImageWithClient(imageDataUri) {
  // 指示模型以严格 JSON 格式返回评分，便于解析
  const instructionText = `请分析这张交互式可视化的内容（content）和布局（layout）。返回严格的 JSON 对象，格式如下：{"content_score": <0-10 数字>, "layout_score": <0-10 数字>, "content_description": "详细描述图片中的文字信息", "layout_description": "详细描述图片的布局（包括结构、元素位置等）"}。只返回 JSON，不要额外文本。`;

  const input = [
    {
      role: "user",
      content: [
        { type: "input_text", text: instructionText },
        { type: "input_image", image_url: imageDataUri },
      ],
    },
  ];

  // 调用 responses.create
  const response = await client.responses.create({ model: MODEL, input });
  return response;
}

// 解析响应，尝试从 output 中提取 JSON（稳健解析）
function extractJsonFromResponse(resp) {
  // resp.output 可能是一个数组，里面每项有 content 数组，content 的元素可能包含 type: 'output_text' 和 text
  try {
    const outputs = resp.output || resp.output?.[0] || [];
    // 合并所有文本片段
    let combinedText = "";
    if (Array.isArray(resp.output)) {
      for (const out of resp.output) {
        if (out.content && Array.isArray(out.content)) {
          for (const c of out.content) {
            if (c.type === "output_text" && c.text)
              combinedText += c.text + "\n";
            if (typeof c === "string") combinedText += c + "\n";
          }
        } else if (typeof out === "string") {
          combinedText += out + "\n";
        }
      }
    } else if (typeof resp.output === "string") {
      combinedText = resp.output;
    }

    if (!combinedText) {
      // Fallback: try resp.output_text or resp.text
      combinedText = resp.output_text || resp.text || "";
    }

    // Try to find the first JSON object in the text
    const jsonMatch = combinedText.match(/\{[\s\S]*\}/m);
    if (jsonMatch) {
      const jsonText = jsonMatch[0];
      return JSON.parse(jsonText);
    }
    return { raw_text: combinedText.trim() };
  } catch (err) {
    return { parse_error: err.message, raw: resp };
  }
}

// 保存结果到 workspace/vlm-test/analysis.json
async function saveAnalysisResult(folderName, apiResponse, parsed) {
  const outDir = path.resolve("./workspace/vlm-test");
  await fs.mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, "analysis.json");
  const payload = {
    timestamp: new Date().toISOString(),
    folder: folderName,
    api_response: apiResponse,
    parsed,
  };
  await fs.writeFile(outPath, JSON.stringify(payload, null, 2), "utf-8");
  return outPath;
}

// 主流程
async function main() {
  try {
    const screenshotPath = await getFirstScreenshot();
    const folderName = path.basename(path.dirname(screenshotPath));
    console.log("找到截图:", screenshotPath);

    const imageDataUri = await readImageAsDataURI(screenshotPath);
    console.log("图片已转为base64 data URI（长度：%d）", imageDataUri.length);

    console.log("发送到模型进行分析...");
    const apiResp = await analyzeImageWithClient(imageDataUri);

    console.log("API 调用完成，正在解析响应...");
    const parsed = extractJsonFromResponse(apiResp);

    const savedPath = await saveAnalysisResult(folderName, apiResp, parsed);
    console.log("分析结果已保存到:", savedPath);

    console.log("解析结果:", parsed);
  } catch (err) {
    console.error("分析失败:", err);
    process.exitCode = 2;
  }
}

main();
