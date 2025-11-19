import OpenAI from "openai";
import "dotenv/config";
import process from "node:process";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

/**
 * HTML 生成 Agent
 * 负责根据用户需求生成交互式 HTML 可视化
 */
export async function generateHTML(
  userQuestion,
  selectedModel,
  systemPrompt = null,
  options = {}
) {
  const { showProgress = false, taskId = null } = options;

  const defaultSystemPrompt =
    "Generate a single HTML file with JavaScript demonstrating the user-given concept. Only respond in a single HTML file.";

  const messages = [
    {
      role: "system",
      content: systemPrompt || defaultSystemPrompt,
    },
    { role: "user", content: userQuestion },
  ];

  // 使用流式输出
  const stream = await client.chat.completions.create({
    messages,
    model: selectedModel,
    stream: true,
  });

  let fullContent = "";

  if (showProgress) {
    console.log(`\n[${taskId || "HTML"}] 开始生成内容...\n`);
  }

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || "";
    if (content) {
      fullContent += content;
      // 只在显示进度时输出到控制台
      if (showProgress) {
        process.stdout.write(content);
      }
    }
  }

  if (showProgress) {
    console.log(`\n\n[${taskId || "HTML"}] 生成完成！\n`);
  }

  const assistantMessage = {
    role: "assistant",
    content: fullContent,
  };

  if (!assistantMessage?.content) {
    throw new Error("No content generated from streaming response.");
  }

  return {
    assistantMessage,
    messages: [...messages],
    model: selectedModel,
  };
}

/**
 * 从 AI 响应中提取 HTML 内容
 */
export function extractHTMLContent(rawContent) {
  const htmlMatch = rawContent.match(/<html[\s\S]*?<\/html>/i);
  return htmlMatch ? htmlMatch[0] : rawContent;
}
