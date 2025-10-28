import OpenAI from "openai";
import { promises as fs } from "fs";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import "dotenv/config";
import process from "node:process";

// 读取模型列表
const modelListData = await fs.readFile("./model-list.json", "utf-8");
const modelList = JSON.parse(modelListData);

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    model: null,
    system: null,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--model":
      case "-m":
        parsed.model = args[++i];
        break;
      case "--system":
      case "-s":
        parsed.system = args[++i];
        break;
      case "--help":
      case "-h":
        parsed.help = true;
        break;
    }
  }

  return parsed;
}

// 显示帮助信息
function showHelp() {
  console.log(`
AI 命令行对话程序

使用方法: node agent.mjs [选项]

选项:
  -m, --model <model>       指定模型名称或编号
  -s, --system <text>       指定系统提示词
  -h, --help               显示此帮助信息

可用模型:
${modelList.map((model, index) => `  ${index + 1}. ${model}`).join("\n")}

使用说明:
  启动后可进行连续对话，输入 'exit' 或 'quit' 退出程序
`);
}

async function userInput(query) {
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
      console.log(`已选择模型: ${selectedModel}`);
      return selectedModel;
    }

    // 检查是否是模型名称
    if (modelList.includes(preSelectedModel)) {
      console.log(`已选择模型: ${preSelectedModel}`);
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
      const input = await userInput(
        "请选择模型 (输入数字1-" + modelList.length + "): "
      );
      const choice = parseInt(input.trim());

      if (isNaN(choice) || choice < 1 || choice > modelList.length) {
        console.log("无效选择，请输入1到" + modelList.length + "之间的数字");
        continue;
      }

      const selectedModel = modelList[choice - 1];
      console.log(`已选择模型: ${selectedModel}`);
      return selectedModel;
    } catch (err) {
      console.error("选择模型时出错：", err);
      throw err;
    }
  }
}

async function chatWithOpenAI(messages, selectedModel) {
  // 使用流式输出
  const stream = await client.chat.completions.create({
    messages,
    model: selectedModel,
    stream: true,
  });

  let fullContent = "";
  console.log("\nAI: ");

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || "";
    if (content) {
      fullContent += content;
      // 实时显示生成的内容
      process.stdout.write(content);
    }
  }

  console.log("\n");

  if (!fullContent) {
    throw new Error("No content generated from streaming response.");
  }

  return {
    role: "assistant",
    content: fullContent,
  };
}

async function startChat(selectedModel, systemPrompt) {
  const messages = [];

  // 添加系统提示（如果有）
  if (systemPrompt) {
    messages.push({
      role: "system",
      content: systemPrompt,
    });
    console.log(`系统提示: ${systemPrompt}\n`);
  }

  console.log("开始对话 (输入 'exit' 或 'quit' 退出)");
  console.log("=".repeat(50));

  while (true) {
    try {
      const userMessage = await userInput("\n你: ");

      if (
        userMessage.toLowerCase() === "exit" ||
        userMessage.toLowerCase() === "quit"
      ) {
        console.log("再见！");
        break;
      }

      if (!userMessage.trim()) {
        continue;
      }

      // 添加用户消息
      messages.push({
        role: "user",
        content: userMessage,
      });

      // 获取AI回复
      const assistantMessage = await chatWithOpenAI(messages, selectedModel);

      // 添加AI回复到对话历史
      messages.push(assistantMessage);
    } catch (err) {
      console.error("对话出错:", err.message);
    }
  }
}

async function main() {
  const args = parseArgs();

  // 显示帮助信息
  if (args.help) {
    showHelp();
    return;
  }

  console.log("AI 命令行对话程序");
  console.log("=".repeat(30));

  // 选择模型
  let selectedModel;
  try {
    selectedModel = await selectModel(args.model);
  } catch (err) {
    console.error("选择模型时出错：", err);
    return;
  }

  // 获取系统提示
  let systemPrompt = null;
  try {
    if (args.system) {
      systemPrompt = args.system;
    } else {
      const systemInput = await userInput("请输入系统提示 (直接回车跳过): ");
      systemPrompt = systemInput.trim() || null;
    }
  } catch (err) {
    console.error("获取系统提示时出错：", err);
    return;
  }

  // 开始对话
  try {
    await startChat(selectedModel, systemPrompt);
  } catch (err) {
    console.error("对话程序出错：", err);
  }
}

main();
