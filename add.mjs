import OpenAI from "openai";
import { promises as fs } from "fs";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { v1 as uuidv1 } from "uuid";
import "dotenv/config";
import process from "node:process";

// 读取模型列表
const modelListData = await fs.readFile("./model-list.json", "utf-8");
const modelList = JSON.parse(modelListData);

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

let workspace = "default";

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    workspace: null,
    model: null,
    question: null,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--workspace":
      case "-w":
        parsed.workspace = args[++i];
        break;
      case "--model":
      case "-m":
        parsed.model = args[++i];
        break;
      case "--question":
      case "-q":
        parsed.question = args[++i];
        break;
      case "--help":
      case "-h":
        parsed.help = true;
        break;
      default:
        if (!arg.startsWith("--") && !arg.startsWith("-")) {
          // 如果没有指定参数，将第一个非选项参数作为问题
          if (!parsed.question) {
            parsed.question = arg;
          }
        }
        break;
    }
  }

  return parsed;
}

// 显示帮助信息
function showHelp() {
  console.log(`
使用方法: node add.mjs [选项]

选项:
  -w, --workspace <name>    指定工作空间名称
  -m, --model <model>       指定模型名称或编号
  -q, --question <text>     指定问题内容
  -h, --help               显示此帮助信息

示例:
  node add.mjs --workspace "10-04" --model "gpt-4o-mini" --question "创建一个冒泡排序演示"
  node add.mjs -w "test" -m 1 -q "制作一个计算器"
  node add.mjs "创建一个时钟" (直接指定问题)

可用模型:
${modelList.map((model, index) => `  ${index + 1}. ${model}`).join("\n")}
`);
}

async function promptInput(query) {
  const rl = createInterface({ input, output });
  try {
    return await rl.question(query);
  } finally {
    rl.close();
  }
}

async function selectModel(preSelectedModel = null) {
  // 如果通过参数预选择了模型
  if (preSelectedModel) {
    // 检查是否是数字（模型编号）
    const modelNumber = parseInt(preSelectedModel);
    if (
      !isNaN(modelNumber) &&
      modelNumber >= 1 &&
      modelNumber <= modelList.length
    ) {
      const selectedModel = modelList[modelNumber - 1];
      console.log(`已选择模型: ${selectedModel}\n`);
      return selectedModel;
    }

    // 检查是否是模型名称
    if (modelList.includes(preSelectedModel)) {
      console.log(`已选择模型: ${preSelectedModel}\n`);
      return preSelectedModel;
    }

    console.log(`警告: 未找到模型 "${preSelectedModel}"，将显示选择列表`);
  }

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
  const args = parseArgs();

  // 显示帮助信息
  if (args.help) {
    showHelp();
    return;
  }

  // 获取工作空间
  if (args.workspace) {
    workspace = args.workspace;
    console.log(`使用工作空间: ${workspace}`);
  } else {
    workspace = await promptInput("请输入工作空间: ");
  }

  let selectedModel;
  try {
    selectedModel = await selectModel(args.model);
  } catch (err) {
    console.error("选择模型时出错：", err);
    return;
  }

  let userInput;
  try {
    if (args.question) {
      userInput = args.question;
      console.log(`使用问题: ${userInput}`);
    } else {
      userInput = await promptInput("请输入提问内容: ");
    }
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
