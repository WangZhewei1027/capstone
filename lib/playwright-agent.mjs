import "dotenv/config";
import process from "node:process";
import { callAIStream } from "./ai-api.mjs";

/**
 * 预处理 HTML 内容，移除所有 CSS 以减少 token 使用
 * @param {string} htmlContent - 完整的 HTML 代码
 * @returns {string} 移除 CSS 后的 HTML 代码
 */
function preprocessHtmlContent(htmlContent) {
  let processed = htmlContent;

  // 移除 <style> 标签及其内容
  processed = processed.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");

  // 移除内联 style 属性
  processed = processed.replace(/\s+style=["'][^"']*["']/gi, "");

  // 移除多余的空白行
  processed = processed.replace(/\n\s*\n\s*\n/g, "\n\n");

  return processed.trim();
}

/**
 * Playwright 测试生成 Agent - 根据 FSM 和 HTML 生成端到端测试
 * @param {string} model - 模型名称
 * @param {string} userPrompt - 用户提示（包含 FSM 和 HTML）
 * @param {string} systemPrompt - 系统提示
 * @param {object} options - 配置选项
 * @param {boolean} options.showProgress - 是否显示进度
 * @param {string} options.taskId - 任务 ID
 * @param {number} options.temperature - 温度参数
 * @returns {Promise<string>} 生成的 Playwright 测试代码
 */
export async function generatePlaywrightTest(
  model,
  userPrompt,
  systemPrompt = null,
  options = {}
) {
  const { showProgress = false, taskId = null, temperature = 0.3 } = options;

  // 默认系统提示
  const defaultSystemPrompt = `You are an expert at writing Playwright end-to-end tests for interactive web applications.

Your task is to:
1. Analyze the provided FSM (Finite State Machine) definition
2. Examine the HTML/JavaScript implementation
3. Generate comprehensive Playwright test code that validates all states and transitions

The test should:
- Use ES module syntax (import/export) - NEVER use require()
- Import necessary Playwright modules using ES6 import syntax
- Test all major user interactions described in the FSM
- Verify state transitions work correctly
- Check visual feedback and DOM changes
- Include assertions for expected behavior
- Be well-organized with descriptive test names
- Use page object patterns where appropriate
- Include setup and teardown
- Follow modern JavaScript/ES2020+ standards

CRITICAL: You MUST use ES module syntax (import) instead of CommonJS (require).
Example: import { test, expect } from '@playwright/test';
NOT: const { test, expect } = require('@playwright/test');

Do NOT fix or modify any errors in the HTML, JavaScript, or DOM environment.

Your task as the Playwright agent is ONLY to:
- load the page exactly as-is,
- observe console logs and page errors,
- let ReferenceError, SyntaxError, TypeError happen naturally,
- and assert that these errors occur.

NEVER:
- inject global variables,
- redefine functions,
- patch broken code,
- simulate missing features,
- or repair the runtime environment.

Generate a complete, runnable Playwright test file (.spec.js).
Only respond with valid JavaScript code, no markdown formatting or code blocks.`;
  try {
    if (showProgress) {
      console.log(
        `\n[${taskId || "Playwright-Agent"}] 开始生成 Playwright 测试...\n`
      );
    }

    const stream = await callAIStream(
      model,
      userPrompt,
      systemPrompt || defaultSystemPrompt,
      {
        temperature,
      }
    );

    let fullContent = "";

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        fullContent += content;
        if (showProgress) {
          process.stdout.write(content);
        }
      }
    }

    if (showProgress) {
      console.log(
        `\n\n[${taskId || "Playwright-Agent"}] Playwright 测试生成完成！\n`
      );
    }

    // 清理可能的 markdown 代码块标记
    let cleanedContent = fullContent.trim();
    if (cleanedContent.startsWith("```javascript")) {
      cleanedContent = cleanedContent.replace(/^```javascript\s*/, "");
    }
    if (cleanedContent.startsWith("```js")) {
      cleanedContent = cleanedContent.replace(/^```js\s*/, "");
    }
    if (cleanedContent.startsWith("```")) {
      cleanedContent = cleanedContent.replace(/^```\s*/, "");
    }
    if (cleanedContent.endsWith("```")) {
      cleanedContent = cleanedContent.replace(/\s*```$/, "");
    }

    // 验证基本的 Playwright 结构
    if (
      !cleanedContent.includes("test(") &&
      !cleanedContent.includes("test.describe(")
    ) {
      console.warn(
        `[${
          taskId || "Playwright-Agent"
        }] 警告: 生成的代码可能不是有效的 Playwright 测试`
      );
    }

    if (showProgress) {
      const lines = cleanedContent.split("\n").length;
      const testCount =
        (cleanedContent.match(/test\(/g) || []).length +
        (cleanedContent.match(/test\.only\(/g) || []).length;
      console.log(
        `[${
          taskId || "Playwright-Agent"
        }] 测试代码生成: ${lines} 行, 约 ${testCount} 个测试用例`
      );
    }

    return cleanedContent;
  } catch (err) {
    console.error(
      `[${taskId || "Playwright-Agent"}] 生成 Playwright 测试时出错:`,
      err
    );
    throw err;
  }
}

/**
 * 生成测试文件名
 * @param {string} resultId - 结果 ID
 * @param {string} topic - 主题（可选）
 * @returns {string} 测试文件名
 */
export function generateTestFileName(resultId, topic = null) {
  // 如果没有 topic，直接使用 UUID
  if (!topic) {
    return `${resultId}.spec.js`;
  }

  // 清理主题名称作为文件名的一部分
  const safeTopic = topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${resultId}-${safeTopic}.spec.js`;
}
