#!/usr/bin/env node
/**
 * HTML to Test Workflow - HTML → Playwright 工作流
 *
 * 直接从 HTML 生成 Playwright 测试，跳过 FSM 分析步骤
 * 适用于：
 * - 快速生成测试用例
 * - 不需要 FSM 建模的场景
 * - 基于实际 HTML 结构直接生成测试
 */

import { promises as fs } from "fs";
import { v1 as uuidv1 } from "uuid";
import { generateHTML } from "./lib/html-agent.mjs";
import {
  generatePlaywrightTest,
  generateTestFileName,
} from "./lib/playwright-agent.mjs";
import { fileWriter } from "./lib/concurrent-file-writer.mjs";

/**
 * 执行 HTML → Playwright Test 工作流
 * @param {Object} config - 工作流配置
 * @param {string} config.question - 用户需求描述
 * @param {string} config.workspace - 工作空间名称
 * @param {string} config.model - 模型名称
 * @param {string} [config.topic] - 主题名称
 * @param {string} [config.systemPrompt] - 自定义系统提示词
 * @param {Object} [config.models] - 各 Agent 的模型配置
 * @param {string} [config.models.html] - HTML Agent 模型
 * @param {string} [config.models.playwright] - Playwright Agent 模型
 * @param {Object} [options] - 可选配置
 * @param {boolean} [options.showProgress=true] - 显示进度
 * @param {string} [options.taskId] - 任务 ID（用于日志）
 */
export async function runHTMLToTestWorkflow(config, options = {}) {
  const {
    question,
    workspace,
    model,
    topic = null,
    systemPrompt = null,
    models = {},
  } = config;

  const { showProgress = true, taskId = null } = options;

  // 确定各 Agent 使用的模型
  const htmlModel = models.html || model;
  const playwrightModel = models.playwright || model;

  // 预生成 ID，确保所有文件名称一致
  const resultId = uuidv1();

  let htmlContent = null;
  let testCode = null;
  let testFileName = null;
  let assistantMessage = null;
  let messages = null;

  try {
    // ========== 阶段 1: HTML 生成 ==========
    if (showProgress) {
      console.log(`\n${"=".repeat(70)}`);
      console.log(`${taskId ? `[${taskId}] ` : ""}阶段 1/2: HTML 生成`);
      console.log(`${"=".repeat(70)}`);
      console.log(`模型: ${htmlModel}`);
      console.log(`需求: ${question}\n`);
    }

    htmlContent = await generateHTML(htmlModel, question, systemPrompt, {
      showProgress,
      taskId: taskId ? `${taskId}-HTML` : "HTML",
    });

    // 构建消息记录
    assistantMessage = {
      role: "assistant",
      content: htmlContent,
    };
    messages = [
      {
        role: "system",
        content:
          systemPrompt ||
          "Generate a single HTML file with JavaScript demonstrating the user-given concept. Only respond in a single HTML file.",
      },
      { role: "user", content: question },
    ];

    if (showProgress) {
      console.log(`✅ HTML 生成成功 (${htmlContent.length} 字符)\n`);
    }

    // ========== 阶段 2: Playwright 测试生成 ==========
    if (showProgress) {
      console.log(`${"=".repeat(70)}`);
      console.log(
        `${taskId ? `[${taskId}] ` : ""}阶段 2/2: Playwright 测试生成`
      );
      console.log(`${"=".repeat(70)}`);
      console.log(`模型: ${playwrightModel}\n`);
    }

    try {
      testFileName = generateTestFileName(resultId, topic || "interactive-app");

      // 构建 Playwright 的 userPrompt - 直接基于 HTML，无 FSM
      const playwrightUserPrompt = `Generate comprehensive Playwright tests for this interactive HTML application.

Application ID: ${resultId}
Workspace: ${workspace}
Topic: ${topic || "Interactive Application"}

HTML Implementation:
${htmlContent}

Requirements:
1. Test file should be named: ${testFileName}
2. The HTML file will be served at: http://127.0.0.1:5500/workspace/${workspace}/html/${resultId}.html
3. Analyze the HTML structure and identify all interactive elements (buttons, inputs, forms, etc.)
4. Create tests that verify the application's functionality by:
   - Testing user interactions (clicks, input, form submissions)
   - Verifying DOM changes and updates
   - Checking visibility and state changes of elements
   - Testing edge cases and error scenarios
5. Use meaningful test descriptions that explain what is being tested
6. Group related tests with describe blocks
7. MUST use ES6 import syntax: import { test, expect } from '@playwright/test'
8. DO NOT use require() - this is an ES module project
9. Add comments explaining the purpose of each test
10. Include proper assertions to verify expected behavior

Test Coverage Guidelines:
- Test initial page load and default state
- Test all interactive controls (buttons, inputs, selects, etc.)
- Test data flow and state updates
- Test visual changes (element visibility, content updates)
- Test error handling and edge cases
- Test accessibility where relevant

Generate the complete test file now:`;

      testCode = await generatePlaywrightTest(
        playwrightModel,
        playwrightUserPrompt,
        null,
        {
          showProgress,
          taskId: taskId ? `${taskId}-TEST` : "TEST",
          temperature: 0.3,
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

    // ========== 保存所有生成的文件 ==========
    if (showProgress) {
      console.log(`${"=".repeat(70)}`);
      console.log(`${taskId ? `[${taskId}] ` : ""}保存文件`);
      console.log(`${"=".repeat(70)}`);
    }

    await saveHTMLToTestResults({
      resultId,
      workspace,
      htmlContent,
      testCode,
      testFileName,
      metadata: {
        question,
        topic,
        htmlModel,
        playwrightModel,
        assistantMessage,
        messages,
        hasTest: !!testCode,
      },
      showProgress,
      taskId,
    });

    // ========== 工作流完成 ==========
    const htmlUrl = `http://127.0.0.1:5500/workspace/${workspace}/html/${resultId}.html`;

    if (showProgress) {
      console.log(`\n${"=".repeat(70)}`);
      console.log(`✅ HTML → Test 工作流完成`);
      console.log(`${"=".repeat(70)}`);
      console.log(`📋 生成摘要:`);
      console.log(
        `   - HTML 文件: workspace/${workspace}/html/${resultId}.html`
      );
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
      testCode,
      testFileName,
      workspace,
    };
  } catch (err) {
    console.error(`\n❌ HTML → Test 工作流执行失败: ${err.message}`);
    if (process.env.DEBUG) {
      console.error(err.stack);
    }

    // 尝试保存已生成的部分结果
    if (htmlContent) {
      try {
        await saveHTMLToTestResults({
          resultId,
          workspace,
          htmlContent,
          testCode,
          testFileName,
          metadata: {
            question,
            topic,
            htmlModel,
            playwrightModel,
            assistantMessage,
            messages,
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
      testCode,
    };
  }
}

/**
 * 保存 HTML → Test 工作流生成的文件
 */
async function saveHTMLToTestResults(params) {
  const {
    resultId,
    workspace,
    htmlContent,
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

  // 2. 保存测试文件
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

  // 3. 保存元数据到独立的 UUID.json 文件
  if (metadata) {
    const dataDir = `./workspace/${workspace}/data`;
    const dataFilePath = `${dataDir}/${resultId}.json`;

    const dataEntry = {
      id: resultId,
      timestamp: new Date().toISOString(),
      type: "html-to-test",
      htmlModel: metadata.htmlModel,
      playwrightModel: metadata.playwrightModel,
      status: metadata.status || "success",
      question: metadata.question,
      answer: metadata.assistantMessage,
      messages: metadata.messages,
      topic: metadata.topic || null,
      hasFSM: false, // HTML → Test 工作流不生成 FSM
      hasTest: metadata.hasTest,
      ...(metadata.error && { error: metadata.error }),
    };

    await fs.mkdir(dataDir, { recursive: true });
    await fileWriter.writeFile(
      dataFilePath,
      JSON.stringify(dataEntry, null, 2)
    );

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
║  HTML to Test Workflow - HTML → Playwright 工作流引擎                  ║
╚════════════════════════════════════════════════════════════════════════╝

这是一个库文件，建议通过批量工作流使用。

使用方法：

1. 在你的代码中导入:
   import { runHTMLToTestWorkflow } from './html-to-test-workflow.mjs';

2. 调用工作流:
   const result = await runHTMLToTestWorkflow({
     question: "创建一个冒泡排序可视化",
     workspace: "test",
     model: "gpt-4o",
     topic: "Bubble Sort"
   });

3. 或创建批量执行脚本使用此工作流

特点：
  • 跳过 FSM 分析，直接从 HTML 生成测试
  • 更快的执行速度（少一个 AI 调用）
  • 适合简单的交互式应用测试
  • 基于 HTML 结构直接推断测试用例

════════════════════════════════════════════════════════════════════════
`);
  process.exit(0);
}

export default runHTMLToTestWorkflow;
