import OpenAI from "openai";
import { promises as fs } from "fs";
import { v1 as uuidv1 } from "uuid";
import "dotenv/config";
import process from "node:process";
import { fileWriter } from "./concurrent-file-writer.mjs";

// 读取模型列表 - 使用绝对路径解决导入问题
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const modelListPath = join(__dirname, "..", "model-list.json");
const modelListData = await fs.readFile(modelListPath, "utf-8");
const modelList = JSON.parse(modelListData);

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

export async function chatWithOpenAI(
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
    console.log(`\n[${taskId || ""}] 开始生成内容...\n`);
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
    console.log(`\n\n[${taskId || ""}] 生成完成！\n`);
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

export async function saveResult(data, workspace, taskId = null) {
  const result = {
    id: uuidv1(),
    timestamp: new Date().toISOString(),
    ...data,
  };

  const filename = `./workspace/${workspace}/data/data.json`;

  try {
    // 使用并发安全的文件写入器
    await fileWriter.appendToJsonFile(filename, result);

    if (taskId) {
      console.log(`[${taskId}] 数据已保存到 ${filename}`);
    }
  } catch (err) {
    console.error(`[${taskId || ""}] 保存数据时出错：`, err);
    throw err;
  }

  // 创建 HTML 文件
  try {
    const htmlDir = `./workspace/${workspace}/html`;
    const htmlFilename = `${htmlDir}/${result.id}.html`;

    // 获取答案内容
    const rawContent =
      typeof data.answer === "string"
        ? data.answer
        : data.answer?.content ?? "";

    // 使用正则提取 <html> 标签之间的内容
    const htmlMatch = rawContent.match(/<html[\s\S]*?<\/html>/i);
    const htmlContent = htmlMatch ? htmlMatch[0] : rawContent;

    await fileWriter.writeFile(htmlFilename, "<!DOCTYPE html>\n" + htmlContent);

    if (taskId) {
      console.log(`[${taskId}] HTML文件已保存: ${htmlFilename}`);
    }
  } catch (err) {
    console.error(`[${taskId || ""}] 创建HTML文件出错：`, err);
  }

  return result.id;
}

export async function processTask(task, options = {}) {
  const { showProgress = false, taskId = null } = options;
  const { workspace, model, question, system } = task;

  let assistantMessage, messages, selectedModel;

  try {
    if (taskId && showProgress) {
      console.log(
        `[${taskId}] 开始处理任务 - 模型: ${model}, 工作空间: ${workspace}`
      );
    }

    const result = await chatWithOpenAI(question, model, system, {
      showProgress,
      taskId,
    });
    assistantMessage = result.assistantMessage;
    messages = result.messages;
    selectedModel = result.model;

    if (taskId && showProgress) {
      console.log(`[${taskId}] 内容生成成功!`);
    }
  } catch (err) {
    console.error(`[${taskId || ""}] 调用OpenAI API时出错：`, err);

    // 保存失败信息
    let data = {
      model: selectedModel,
      status: "error",
      question: question,
      answer: assistantMessage,
      messages: messages,
      evaluation: { score: null, notes: "" },
      error: err.message,
    };

    const errorId = await saveResult(data, workspace, taskId);

    return {
      success: false,
      error: err.message,
      resultId: errorId,
    };
  }

  try {
    let data = {
      model: selectedModel,
      status: "success",
      question: question,
      answer: assistantMessage,
      messages: messages,
      evaluation: { score: null, notes: "" },
    };

    let resultId = await saveResult(data, workspace, taskId);

    if (taskId && showProgress) {
      console.log(`[${taskId}] 任务完成! 结果ID: ${resultId}`);
      console.log(
        `[${taskId}] 查看地址: http://127.0.0.1:5500/workspace/${workspace}/html/${resultId}.html`
      );
    }

    return {
      success: true,
      resultId: resultId,
      url: `http://127.0.0.1:5500/workspace/${workspace}/html/${resultId}.html`,
    };
  } catch (err) {
    console.error(`[${taskId || ""}] 保存数据时出错：`, err);
    return {
      success: false,
      error: err.message,
    };
  }
}

export { modelList };
