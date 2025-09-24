import OpenAI from "openai";
import { promises as fs } from "fs";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { v1 as uuidv1 } from "uuid";

const client = new OpenAI({
  apiKey: "sk-TMWW3DAvUDjmpLr61kzSLPlJuzTbksEM1tyj7JyM1jHoafzg", // xxx为GitHub授权的每个账号的key值
  baseURL: "https://turingai.plus/v1",
});

async function promptInput(query) {
  const rl = createInterface({ input, output });
  try {
    return await rl.question(query);
  } finally {
    rl.close();
  }
}

async function chatWithOpenAI(userInput) {
  const messages = [
    {
      role: "system",
      content:
        "Generate a single HTML file with JavaScript demonstrating the user-given concept. Only respond in a single HTML file.",
    },
    { role: "user", content: userInput },
  ];

  const model = "claude-sonnet-4-20250514"; // 替换为你想使用的模型名称
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

  // Create HTML file in ./html folder
  try {
    await fs.mkdir("./html", { recursive: true });
    const htmlFilename = `./html/${data.id}.html`;
    await fs.writeFile(
      htmlFilename,
      typeof data.answer === "string" ? data.answer : data.answer?.content ?? ""
    );
  } catch (err) {
    console.error("创建HTML文件出错：", err);
  }
}

async function main() {
  try {
    const userInput = await promptInput("请输入提问内容: ");
    console.log("正在生成，请稍候...");
    const { assistantMessage, messages, model } = await chatWithOpenAI(
      userInput
    );
    console.log("内容生成成功!");
    console.log("正在保存...");
    const id = uuidv1();
    const data = {
      id: id,
      model: model,
      timestamp: new Date().toISOString(),
      question: userInput,
      answer: assistantMessage,
      messages: messages,
      evaluation: { score: null, notes: "" }, // 预留的评价字段
      tags: ["9/24"], // 预留的标签字段
    };
    await persistQA(data, "data.json");
    console.log("已保存为HTML文件，打开下面的链接查看效果：");
    console.log(`http://127.0.0.1:5500/html/${id}.html`);
  } catch (err) {
    console.error("运行出错：", err);
  }
}

main();
