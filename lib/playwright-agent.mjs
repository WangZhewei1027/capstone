import OpenAI from "openai";
import "dotenv/config";
import process from "node:process";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

/**
 * Playwright 测试生成 Agent - 根据 FSM 和 HTML 生成端到端测试
 * @param {object} fsmData - FSM JSON 对象
 * @param {string} htmlContent - 完整的 HTML 代码
 * @param {string} resultId - 生成的 HTML 文件 ID
 * @param {object} options - 配置选项
 * @returns {Promise<string>} 生成的 Playwright 测试代码
 */
export async function generatePlaywrightTest(
  fsmData,
  htmlContent,
  resultId,
  options = {}
) {
  const {
    showProgress = false,
    taskId = null,
    model = "gpt-4o",
    workspace = "default",
  } = options;

  const systemPrompt = `You are an expert at writing Playwright end-to-end tests for interactive web applications.

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

Generate a complete, runnable Playwright test file (.spec.js).
Only respond with valid JavaScript code, no markdown formatting or code blocks.`;

  const userPrompt = `Generate comprehensive Playwright tests for this interactive application.

Application ID: ${resultId}
Workspace: ${workspace}
Topic: ${fsmData.topic || "Interactive Application"}

FSM Definition:
${JSON.stringify(fsmData, null, 2)}

HTML Implementation:
${htmlContent.substring(0, 3000)}${
    htmlContent.length > 3000 ? "\n... (truncated)" : ""
  }

Requirements:
1. Test file should be named: ${resultId}.spec.js
2. The HTML file will be served at: http://127.0.0.1:5500/workspace/${workspace}/html/${resultId}.html
3. Test all states mentioned in the FSM
4. Test all events/transitions in the FSM
5. Verify onEnter/onExit actions if mentioned
6. Include edge cases and error scenarios
7. Add comments explaining what each test validates
8. Use modern async/await syntax
9. Group related tests with describe blocks
10. MUST use ES6 import syntax: import { test, expect } from '@playwright/test'
11. DO NOT use require() - this is an ES module project

Generate the complete test file now:`;

  try {
    if (showProgress) {
      console.log(
        `\n[${taskId || "Playwright-Agent"}] 开始生成 Playwright 测试...\n`
      );
    }

    const stream = await client.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      model: model,
      stream: true,
      temperature: 0.3,
    });

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
