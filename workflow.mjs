#!/usr/bin/env node
/**
 * Workflow.mjs - HTML → FSM → Playwright 工作流
 *
 * 完整的三阶段工作流：
 * 1. HTML Agent: 生成交互式 HTML 可视化
 * 2. FSM Agent: 分析 HTML 并生成有限状态机
 * 3. Playwright Agent: 基于 FSM 生成端到端测试
 */

import { promises as fs } from "fs";
import { v1 as uuidv1 } from "uuid";
import { generateHTML, extractHTMLContent } from "./lib/html-agent.mjs";
import { generateFSM } from "./lib/fsm-agent.mjs";
import {
  generatePlaywrightTest,
  generateTestFileName,
} from "./lib/playwright-agent.mjs";
import { fileWriter } from "./lib/concurrent-file-writer.mjs";

/**
 * 执行完整工作流
 * @param {Object} config - 工作流配置
 * @param {string} config.question - 用户需求描述
 * @param {string} config.workspace - 工作空间名称
 * @param {string} config.model - 模型名称
 * @param {string} [config.topic] - 主题名称（用于 FSM）
 * @param {string} [config.systemPrompt] - 自定义系统提示词
 * @param {Object} [config.models] - 各 Agent 的模型配置
 * @param {string} [config.models.html] - HTML Agent 模型
 * @param {string} [config.models.fsm] - FSM Agent 模型
 * @param {string} [config.models.playwright] - Playwright Agent 模型
 * @param {Object} [options] - 可选配置
 * @param {boolean} [options.showProgress=true] - 显示进度
 * @param {boolean} [options.enableFSM=true] - 启用 FSM 生成
 * @param {boolean} [options.enableTests=true] - 启用测试生成
 * @param {string} [options.taskId] - 任务 ID（用于日志）
 */
export async function runWorkflow(config, options = {}) {
  const {
    question,
    workspace,
    model,
    topic = null,
    systemPrompt = null,
    models = {},
  } = config;

  const {
    showProgress = true,
    enableFSM = true,
    enableTests = true,
    taskId = null,
  } = options;

  // 确定各 Agent 使用的模型
  const htmlModel = models.html || model;
  const fsmModel = models.fsm || model;
  const playwrightModel = models.playwright || model;

  // 预生成 ID，确保所有文件名称一致
  const resultId = uuidv1();

  let htmlContent = null;
  let fsmData = null;
  let testCode = null;
  let testFileName = null;
  let assistantMessage = null;
  let messages = null;

  try {
    // ========== 阶段 1: HTML 生成 ==========
    if (showProgress) {
      console.log(`\n${"=".repeat(70)}`);
      console.log(`${taskId ? `[${taskId}] ` : ""}阶段 1/3: HTML 生成`);
      console.log(`${"=".repeat(70)}`);
      console.log(`模型: ${htmlModel}`);
      console.log(`需求: ${question}\n`);
    }

    const htmlResult = await generateHTML(question, htmlModel, systemPrompt, {
      showProgress,
      taskId: taskId ? `${taskId}-HTML` : "HTML",
    });

    assistantMessage = htmlResult.assistantMessage;
    messages = htmlResult.messages;
    htmlContent = extractHTMLContent(htmlResult.assistantMessage.content);

    if (showProgress) {
      console.log(`✅ HTML 生成成功 (${htmlContent.length} 字符)\n`);
    }

    // ========== 阶段 2: FSM 生成 ==========
    if (enableFSM) {
      if (showProgress) {
        console.log(`${"=".repeat(70)}`);
        console.log(`${taskId ? `[${taskId}] ` : ""}阶段 2/3: FSM 分析`);
        console.log(`${"=".repeat(70)}`);
        console.log(`模型: ${fsmModel}`);
        console.log(`主题: ${topic || "Interactive Application"}\n`);
      }

      try {
        fsmData = await generateFSM(
          htmlContent,
          topic || "Interactive Application",
          {
            showProgress,
            taskId: taskId ? `${taskId}-FSM` : "FSM",
            model: fsmModel,
          }
        );

        if (showProgress) {
          console.log(`✅ FSM 生成成功`);
          console.log(`   - 状态数: ${fsmData.states?.length || 0}`);
          console.log(`   - 事件数: ${fsmData.events?.length || 0}`);
          console.log(`   - 转换数: ${fsmData.transitions?.length || 0}\n`);
        }
      } catch (err) {
        console.error(`⚠️  FSM 生成失败: ${err.message}`);
        fsmData = null;
      }
    } else {
      if (showProgress) {
        console.log(`⏭️  跳过阶段 2: FSM 生成已禁用\n`);
      }
    }

    // ========== 阶段 3: Playwright 测试生成 ==========
    if (enableTests) {
      if (!fsmData) {
        if (showProgress) {
          console.log(`⏭️  跳过阶段 3: 测试生成需要 FSM 数据\n`);
        }
      } else {
        if (showProgress) {
          console.log(`${"=".repeat(70)}`);
          console.log(
            `${taskId ? `[${taskId}] ` : ""}阶段 3/3: Playwright 测试生成`
          );
          console.log(`${"=".repeat(70)}`);
          console.log(`模型: ${playwrightModel}\n`);
        }

        try {
          testFileName = generateTestFileName(resultId, fsmData.topic);
          testCode = await generatePlaywrightTest(
            fsmData,
            htmlContent,
            resultId,
            {
              showProgress,
              taskId: taskId ? `${taskId}-TEST` : "TEST",
              model: playwrightModel,
              workspace,
            }
          );

          if (showProgress) {
            console.log(`✅ 测试生成成功`);
            console.log(`   - 测试文件: ${testFileName}\n`);
          }
        } catch (err) {
          console.error(`⚠️  测试生成失败: ${err.message}`);
          testCode = null;
          testFileName = null;
        }
      }
    } else {
      if (showProgress) {
        console.log(`⏭️  跳过阶段 3: 测试生成已禁用\n`);
      }
    }

    // ========== 保存所有生成的文件 ==========
    if (showProgress) {
      console.log(`${"=".repeat(70)}`);
      console.log(`${taskId ? `[${taskId}] ` : ""}保存文件`);
      console.log(`${"=".repeat(70)}`);
    }

    await saveWorkflowResults({
      resultId,
      workspace,
      htmlContent,
      fsmData,
      testCode,
      testFileName,
      metadata: {
        question,
        topic,
        model: htmlModel,
        assistantMessage,
        messages,
        hasFSM: !!fsmData,
        hasTest: !!testCode,
      },
      showProgress,
      taskId,
    });

    // ========== 工作流完成 ==========
    const htmlUrl = `http://127.0.0.1:5500/workspace/${workspace}/html/${resultId}.html`;

    if (showProgress) {
      console.log(`\n${"=".repeat(70)}`);
      console.log(`✅ 工作流完成`);
      console.log(`${"=".repeat(70)}`);
      console.log(`📋 生成摘要:`);
      console.log(
        `   - HTML 文件: workspace/${workspace}/html/${resultId}.html`
      );
      if (fsmData) {
        console.log(
          `   - FSM 文件: workspace/${workspace}/fsm/${resultId}.json`
        );
      }
      if (testCode) {
        console.log(
          `   - 测试文件: workspace/${workspace}/tests/${testFileName}`
        );
      }
      console.log(`\n🌐 查看地址: ${htmlUrl}`);
      if (testCode) {
        console.log(`🧪 运行测试: npx playwright test ${testFileName}`);
      }
      console.log(`${"=".repeat(70)}\n`);
    }

    return {
      success: true,
      resultId,
      htmlUrl,
      htmlContent,
      fsmData,
      testCode,
      testFileName,
      workspace,
    };
  } catch (err) {
    console.error(`\n❌ 工作流执行失败: ${err.message}`);
    if (process.env.DEBUG) {
      console.error(err.stack);
    }

    // 尝试保存已生成的部分结果
    if (htmlContent) {
      try {
        await saveWorkflowResults({
          resultId,
          workspace,
          htmlContent,
          fsmData,
          testCode,
          testFileName,
          metadata: {
            question,
            topic,
            model: htmlModel,
            assistantMessage,
            messages,
            hasFSM: !!fsmData,
            hasTest: !!testCode,
            status: "error",
            error: err.message,
          },
          showProgress: false,
        });
      } catch (saveErr) {
        console.error(`保存部分结果失败: ${saveErr.message}`);
      }
    }

    return {
      success: false,
      error: err.message,
      resultId,
      htmlContent,
      fsmData,
      testCode,
    };
  }
}

/**
 * 保存工作流生成的所有文件
 */
async function saveWorkflowResults(params) {
  const {
    resultId,
    workspace,
    htmlContent,
    fsmData,
    testCode,
    testFileName,
    metadata,
    showProgress = false,
    taskId = null,
  } = params;

  // 1. 保存 HTML 文件
  if (htmlContent) {
    const htmlDir = `./workspace/${workspace}/html`;
    const htmlFilePath = `${htmlDir}/${resultId}.html`;

    await fs.mkdir(htmlDir, { recursive: true });
    await fileWriter.writeFile(htmlFilePath, `<!DOCTYPE html>\n${htmlContent}`);

    if (showProgress) {
      console.log(
        `${taskId ? `[${taskId}] ` : ""}✓ HTML 文件已保存: ${htmlFilePath}`
      );
    }
  }

  // 2. 保存 FSM JSON 文件
  if (fsmData) {
    const fsmDir = `./workspace/${workspace}/fsm`;
    const fsmFilePath = `${fsmDir}/${resultId}.json`;

    await fs.mkdir(fsmDir, { recursive: true });
    await fileWriter.writeFile(fsmFilePath, JSON.stringify(fsmData, null, 2));

    if (showProgress) {
      console.log(
        `${taskId ? `[${taskId}] ` : ""}✓ FSM 文件已保存: ${fsmFilePath}`
      );
    }
  }

  // 3. 保存测试文件
  if (testCode && testFileName) {
    const testDir = `./workspace/${workspace}/tests`;
    const testFilePath = `${testDir}/${testFileName}`;

    await fs.mkdir(testDir, { recursive: true });
    await fileWriter.writeFile(testFilePath, testCode);

    if (showProgress) {
      console.log(
        `${taskId ? `[${taskId}] ` : ""}✓ 测试文件已保存: ${testFilePath}`
      );
    }
  }

  // 4. 保存元数据到 data.json
  if (metadata) {
    const dataDir = `./workspace/${workspace}/data`;
    const dataFilePath = `${dataDir}/data.json`;

    const dataEntry = {
      id: resultId,
      timestamp: new Date().toISOString(),
      model: metadata.model,
      status: metadata.status || "success",
      question: metadata.question,
      answer: metadata.assistantMessage,
      messages: metadata.messages,
      topic: metadata.topic || null,
      hasFSM: metadata.hasFSM,
      hasTest: metadata.hasTest,
      evaluation: { score: null, notes: "" },
      ...(metadata.error && { error: metadata.error }),
    };

    await fs.mkdir(dataDir, { recursive: true });
    await fileWriter.appendToJsonFile(dataFilePath, dataEntry);

    if (showProgress) {
      console.log(
        `${taskId ? `[${taskId}] ` : ""}✓ 元数据已保存: ${dataFilePath}`
      );
    }
  }
}

// 如果直接运行此文件，显示使用说明
if (process.argv[1] === new URL(import.meta.url).pathname) {
  console.log(`
╔════════════════════════════════════════════════════════════════════════╗
║  Workflow.mjs - HTML → FSM → Playwright 工作流引擎                     ║
╚════════════════════════════════════════════════════════════════════════╝

这是一个库文件，不能直接运行。

使用方法：

1. 在你的代码中导入:
   import { runWorkflow } from './workflow.mjs';

2. 调用工作流:
   const result = await runWorkflow({
     question: "创建一个冒泡排序可视化",
     workspace: "test",
     model: "gpt-4o",
     topic: "Bubble Sort"
   });

3. 或使用主入口文件:
   node add.mjs -q "创建冒泡排序可视化" -w test -t "Bubble Sort"

════════════════════════════════════════════════════════════════════════
`);
  process.exit(0);
}

export default runWorkflow;
