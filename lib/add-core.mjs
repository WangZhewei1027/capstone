import OpenAI from "openai";
import { promises as fs } from "fs";
import { v1 as uuidv1 } from "uuid";
import "dotenv/config";
import process from "node:process";
import { fileWriter } from "./concurrent-file-writer.mjs";
import { generateFSM, insertFSMIntoHTML } from "./fsm-agent.mjs";
import {
  generatePlaywrightTest,
  generateTestFileName,
} from "./playwright-agent.mjs";

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

export async function saveResult(data, workspace, taskId = null, options = {}) {
  const {
    htmlContent = null,
    fsmData = null,
    testCode = null,
    testFileName = null,
    preGeneratedId = null, // 可选的预生成 ID
  } = options;

  const result = {
    id: preGeneratedId || uuidv1(), // 使用预生成的 ID 或生成新的
    timestamp: new Date().toISOString(),
    ...data,
  };

  // 如果提供了 FSM 数据，添加到结果中
  if (fsmData) {
    result.fsm = fsmData;
  }

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
    let rawContent =
      typeof data.answer === "string"
        ? data.answer
        : data.answer?.content ?? "";

    // 如果提供了完整的 HTML 内容，直接使用
    if (htmlContent) {
      rawContent = htmlContent;
    }

    // 使用正则提取 <html> 标签之间的内容
    const htmlMatch = rawContent.match(/<html[\s\S]*?<\/html>/i);
    let htmlContentToSave = htmlMatch ? htmlMatch[0] : rawContent;

    // 不再插入 FSM 到 HTML 中

    await fileWriter.writeFile(
      htmlFilename,
      "<!DOCTYPE html>\n" + htmlContentToSave
    );

    if (taskId) {
      console.log(`[${taskId}] HTML文件已保存: ${htmlFilename}`);
    }
  } catch (err) {
    console.error(`[${taskId || ""}] 创建HTML文件出错：`, err);
  }

  // 保存 FSM 到单独的 JSON 文件
  if (fsmData) {
    try {
      const fsmDir = `./workspace/${workspace}/fsm`;
      const fsmFilePath = `${fsmDir}/${result.id}.json`;

      // 确保 FSM 目录存在
      await fs.mkdir(fsmDir, { recursive: true });

      await fileWriter.writeFile(fsmFilePath, JSON.stringify(fsmData, null, 2));

      if (taskId) {
        console.log(`[${taskId}] FSM文件已保存: ${fsmFilePath}`);
      }
    } catch (err) {
      console.error(`[${taskId || ""}] 保存FSM文件出错：`, err);
    }
  }

  // 保存测试文件
  if (testCode && testFileName) {
    try {
      const testDir = `./workspace/${workspace}/tests`;
      const testFilePath = `${testDir}/${testFileName}`;

      // 确保测试目录存在
      await fs.mkdir(testDir, { recursive: true });

      await fileWriter.writeFile(testFilePath, testCode);

      if (taskId) {
        console.log(`[${taskId}] 测试文件已保存: ${testFilePath}`);
      }
    } catch (err) {
      console.error(`[${taskId || ""}] 保存测试文件出错：`, err);
    }
  }

  return result.id;
}

export async function processTask(task, options = {}) {
  const {
    showProgress = false,
    taskId = null,
    enableFSM = true,
    enableTests = false,
  } = options;
  const { workspace, model, question, system, topic, models } = task;

  // 获取每个 Agent 的模型配置
  const htmlModel = model; // Agent 1 使用 task.model
  const fsmModel = models?.fsmAgent || model; // Agent 2 使用配置或默认
  const testModel = models?.testAgent || model; // Agent 3 使用配置或默认

  let assistantMessage, messages, selectedModel;

  // ========== 阶段 1: HTML 生成 Agent ==========
  try {
    if (taskId && showProgress) {
      console.log(`[${taskId}] ========== 阶段 1: HTML 生成 ==========`);
      console.log(
        `[${taskId}] 开始处理任务 - 模型: ${htmlModel}, 工作空间: ${workspace}`
      );
    }

    const result = await chatWithOpenAI(question, htmlModel, system, {
      showProgress,
      taskId: taskId ? `${taskId}-HTML` : null,
    });
    assistantMessage = result.assistantMessage;
    messages = result.messages;
    selectedModel = result.model;

    if (taskId && showProgress) {
      console.log(`[${taskId}] HTML 内容生成成功!`);
    }
  } catch (err) {
    console.error(`[${taskId || ""}] 调用 HTML 生成 Agent 时出错：`, err);

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

  // 提取 HTML 内容
  const rawContent = assistantMessage.content;
  const htmlMatch = rawContent.match(/<html[\s\S]*?<\/html>/i);
  let htmlContent = htmlMatch ? htmlMatch[0] : rawContent;

  // ========== 阶段 2: FSM 生成 Agent ==========
  let fsmData = null;

  if (enableFSM) {
    try {
      if (taskId && showProgress) {
        console.log(`\n[${taskId}] ========== 阶段 2: FSM 生成 ==========`);
        console.log(`[${taskId}] 使用模型: ${fsmModel}`);
      }

      // 确定主题
      const fsmTopic = topic || "Interactive Application";

      fsmData = await generateFSM(htmlContent, fsmTopic, {
        showProgress,
        taskId: taskId ? `${taskId}-FSM` : null,
        model: fsmModel, // 使用配置的 FSM 模型
      });

      if (taskId && showProgress) {
        console.log(`[${taskId}] FSM 生成成功!`);
        console.log(`[${taskId}] - 状态数: ${fsmData.states?.length || 0}`);
        console.log(`[${taskId}] - 事件数: ${fsmData.events?.length || 0}`);
      }

      // 不再将 FSM 插入到 HTML 中，单独保存为 JSON 文件
    } catch (err) {
      console.error(`[${taskId || ""}] FSM 生成失败（继续保存 HTML）:`, err);
      // FSM 生成失败不影响整体流程
      fsmData = null;
    }
  }

  // ========== 阶段 3: Playwright 测试生成 Agent ==========
  let testCode = null;
  let testFileName = null;
  let preGeneratedResultId = null; // 预生成 ID

  if (enableTests && fsmData) {
    try {
      if (taskId && showProgress) {
        console.log(
          `\n[${taskId}] ========== 阶段 3: Playwright 测试生成 ==========`
        );
        console.log(`[${taskId}] 使用模型: ${testModel}`);
      }

      // 预生成 resultId，确保测试文件中的 URL 和实际 HTML 文件名一致
      preGeneratedResultId = uuidv1();
      testFileName = generateTestFileName(preGeneratedResultId, fsmData.topic);

      testCode = await generatePlaywrightTest(
        fsmData,
        htmlContent, // 使用原始 HTML 内容
        preGeneratedResultId,
        {
          showProgress,
          taskId: taskId ? `${taskId}-TEST` : null,
          model: testModel, // 使用配置的测试模型
          workspace: workspace, // 传递 workspace
        }
      );

      if (taskId && showProgress) {
        console.log(`[${taskId}] Playwright 测试生成成功!`);
        console.log(`[${taskId}] - 测试文件名: ${testFileName}`);
      }
    } catch (err) {
      console.error(
        `[${taskId || ""}] Playwright 测试生成失败（继续保存 HTML 和 FSM）:`,
        err
      );
      // 测试生成失败不影响整体流程
      testCode = null;
      testFileName = null;
    }
  } else if (enableTests && !fsmData) {
    if (taskId && showProgress) {
      console.log(
        `[${taskId}] 跳过测试生成（需要先生成 FSM，请启用 enableFSM）`
      );
    }
  }

  // ========== 阶段 4: 保存结果 ==========
  try {
    if (taskId && showProgress) {
      console.log(`\n[${taskId}] ========== 阶段 4: 保存结果 ==========`);
    }

    let data = {
      model: selectedModel,
      status: "success",
      question: question,
      answer: assistantMessage,
      messages: messages,
      evaluation: { score: null, notes: "" },
      topic: topic || null,
      hasFSM: !!fsmData,
      hasTest: !!testCode,
    };

    let resultId = await saveResult(data, workspace, taskId, {
      htmlContent: htmlContent, // 使用原始 HTML 内容
      fsmData: fsmData,
      testCode: testCode,
      testFileName: testFileName,
      preGeneratedId: preGeneratedResultId, // 传递预生成的 ID
    });

    if (taskId && showProgress) {
      console.log(`\n[${taskId}] ========== 任务完成 ==========`);
      console.log(`[${taskId}] 结果ID: ${resultId}`);
      console.log(`[${taskId}] HTML 生成: ✓`);
      console.log(`[${taskId}] FSM 生成: ${fsmData ? "✓" : "✗"}`);
      console.log(`[${taskId}] 测试生成: ${testCode ? "✓" : "✗"}`);
      console.log(
        `[${taskId}] 查看地址: http://127.0.0.1:5500/workspace/${workspace}/html/${resultId}.html`
      );
      if (fsmData) {
        console.log(
          `[${taskId}] FSM 文件: workspace/${workspace}/fsm/${resultId}.json`
        );
      }
      if (testCode) {
        console.log(
          `[${taskId}] 测试文件: workspace/${workspace}/tests/${testFileName}`
        );
      }
    }

    return {
      success: true,
      resultId: resultId,
      url: `http://127.0.0.1:5500/workspace/${workspace}/html/${resultId}.html`,
      hasFSM: !!fsmData,
      fsmData: fsmData,
      hasTest: !!testCode,
      testFileName: testFileName,
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
