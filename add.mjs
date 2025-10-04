import OpenAI from "openai";
import { promises as fs } from "fs";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { v1 as uuidv1 } from "uuid";
import "dotenv/config";

// 读取模型列表
const modelListData = await fs.readFile("./model-list.json", "utf-8");
const modelList = JSON.parse(modelListData);

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

let workspace = "default";

async function promptInput(query) {
  const rl = createInterface({ input, output });
  try {
    return await rl.question(query);
  } finally {
    rl.close();
  }
}

async function selectModel() {
  console.log("\n可用的模型列表：");
  modelList.forEach((model, index) => {
    console.log(`${index + 1}. ${model}`);
  });

  while (true) {
    try {
      const input = await promptInput(
        "请选择模型 (输入数字1-" + modelList.length + "): "
      );
      const choice = parseInt(input.trim());

      if (isNaN(choice) || choice < 1 || choice > modelList.length) {
        console.log("无效选择，请输入1到" + modelList.length + "之间的数字");
        continue;
      }

      const selectedModel = modelList[choice - 1];
      console.log(`已选择模型: ${selectedModel}\n`);
      return selectedModel;
    } catch (err) {
      console.error("选择模型时出错：", err);
      throw err;
    }
  }
}

async function chatWithOpenAI(userInput, selectedModel) {
  const messages = [
    {
      role: "system",
      content:
        "Generate a single HTML file with JavaScript demonstrating the user-given concept. Only respond in a single HTML file.",
    },
    { role: "user", content: userInput },
  ];

  const model = selectedModel; // 使用选择的模型
  const raw = await client.chat.completions.create({
    messages,
    model: model,
  });

  // Some gateways return slightly different shapes. Normalize here.
  const normalizeAssistantMessage = (resp) => {
    // If it's a stringified JSON, parse it first
    if (typeof resp === "string") {
      try {
        resp = JSON.parse(resp);
      } catch {
        return { role: "assistant", content: resp };
      }
    }

    // OpenAI-compatible shape: choices[0].message
    const msg = resp?.choices?.[0]?.message;
    if (msg?.content) return msg;

    // Some proxies put text directly under choices[0].text
    const text = resp?.choices?.[0]?.text;
    if (typeof text === "string") return { role: "assistant", content: text };

    // Anthropic-like shape: content string at top-level
    if (typeof resp?.content === "string")
      return { role: "assistant", content: resp.content };

    // Fallback to output_text if present
    if (typeof resp?.output_text === "string")
      return { role: "assistant", content: resp.output_text };

    // Last resort: stringify entire response
    return {
      role: "assistant",
      content: typeof resp === "object" ? JSON.stringify(resp) : String(resp),
    };
  };

  const assistantMessage = normalizeAssistantMessage(raw);

  if (!assistantMessage?.content) {
    throw new Error(
      "Unexpected API response shape; no assistant content found."
    );
  }

  // Log a compact preview for debugging
  console.log("[DEBUG] Received completion:", {
    hasChoices: !!raw?.choices,
    firstChoiceKeys: raw?.choices?.[0] ? Object.keys(raw.choices[0]) : null,
    contentPreview: assistantMessage.content.slice(0, 80) + "...",
  });

  return {
    assistantMessage,
    messages: [...messages],
    model,
  };
}

async function persistQA(data, filename = "data.json") {
  let existingData = [];

  // 确保数据文件目录存在
  try {
    const dir = filename.substring(0, filename.lastIndexOf("/"));
    if (dir) {
      await fs.mkdir(dir, { recursive: true });
    }
  } catch (err) {
    console.error("创建数据目录时出错：", err);
  }

  try {
    const fileContent = await fs.readFile(filename, "utf-8");
    existingData = JSON.parse(fileContent) || [];
    if (!Array.isArray(existingData)) {
      existingData = [];
    }
  } catch (err) {
    // If file does not exist or is invalid, start with empty array
    existingData = [];
  }
  existingData.push(data);
  await fs.writeFile(filename, JSON.stringify(existingData, null, 2));

  // Create HTML file in workspace folder
  try {
    const htmlDir = `./workspace/${workspace}/html`;
    await fs.mkdir(htmlDir, { recursive: true });
    const htmlFilename = `${htmlDir}/${data.id}.html`;

    // 获取答案内容
    const rawContent =
      typeof data.answer === "string"
        ? data.answer
        : data.answer?.content ?? "";

    // 使用正则提取 <html> 标签之间的内容
    const htmlMatch = rawContent.match(/<html[\s\S]*?<\/html>/i);
    const htmlContent = htmlMatch ? htmlMatch[0] : rawContent;

    await fs.writeFile(htmlFilename, htmlContent);
  } catch (err) {
    console.error("创建HTML文件出错：", err);
  }
}

async function main() {
  workspace = await promptInput("请输入工作空间: ");

  let selectedModel;
  try {
    selectedModel = await selectModel();
  } catch (err) {
    console.error("选择模型时出错：", err);
    return;
  }

  let userInput;
  try {
    userInput = await promptInput("请输入提问内容: ");
  } catch (err) {
    console.error("获取用户输入时出错：", err);
    return;
  }

  let assistantMessage, messages, model;
  try {
    console.log("正在生成，请稍候...");
    const result = await chatWithOpenAI(userInput, selectedModel);
    assistantMessage = result.assistantMessage;
    messages = result.messages;
    model = result.model;
    console.log("内容生成成功!");
  } catch (err) {
    console.error("调用OpenAI API时出错：", err);
    return;
  }

  let id, data;
  try {
    console.log("正在保存...");
    id = uuidv1();
    data = {
      id: id,
      model: model,
      timestamp: new Date().toISOString(),
      question: userInput,
      answer: assistantMessage,
      messages: messages,
      evaluation: { score: null, notes: "" }, // 预留的评价字段
      tags: ["test"], // 预留的标签字段
    };
  } catch (err) {
    console.error("构造数据对象时出错：", err);
    return;
  }

  try {
    await persistQA(data, `./workspace/${workspace}/data/data.json`);
    console.log("已保存为HTML文件，打开下面的链接查看效果：");
    console.log(`http://127.0.0.1:5500/workspace/${workspace}/html/${id}.html`);
  } catch (err) {
    console.error("保存数据时出错：", err);
    return;
  }
}

main();
