import OpenAI from "openai";
import readline from "readline";
import "dotenv/config";
import process from "node:process";

const openai = new OpenAI({
  baseURL:
    "https://ly27rtwnmzd55etf.us-east-1.aws.endpoints.huggingface.cloud/v1/",
  apiKey: process.env.HF_TOKEN || "$HF_TOKEN",
});

// 创建readline接口用于命令行交互
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// 存储对话历史
const conversationHistory = [];

console.log("=== Llama 聊天程序 ===");
console.log("输入 'exit' 或 'quit' 退出程序");
console.log("输入 'clear' 清空对话历史\n");

// 提问函数
function askQuestion(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer);
    });
  });
}

// 发送消息并获取回复
async function sendMessage(userMessage) {
  // 添加用户消息到历史
  conversationHistory.push({
    role: "user",
    content: userMessage,
  });

  try {
    const stream = await openai.chat.completions.create({
      model: "meta-llama/Llama-3.2-1B-Instruct",
      messages: conversationHistory,
      stream: true,
      max_tokens: 500,
    });

    process.stdout.write("助手: ");
    let assistantMessage = "";

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      assistantMessage += content;
      process.stdout.write(content);
    }

    console.log("\n");

    // 添加助手回复到历史
    conversationHistory.push({
      role: "assistant",
      content: assistantMessage,
    });
  } catch (error) {
    console.error("\n错误:", error.message);
  }
}

// 主聊天循环
async function chatLoop() {
  while (true) {
    const userInput = await askQuestion("你: ");

    // 处理特殊命令
    if (
      userInput.toLowerCase() === "exit" ||
      userInput.toLowerCase() === "quit"
    ) {
      console.log("再见!");
      d;
      rl.close();
      process.exit(0);
    }

    if (userInput.toLowerCase() === "clear") {
      conversationHistory.length = 0;
      console.log("对话历史已清空\n");
      continue;
    }

    if (!userInput.trim()) {
      continue;
    }

    await sendMessage(userInput);
  }
}

// 启动聊天程序
chatLoop();
