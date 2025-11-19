#!/usr/bin/env node
/**
 * 新的工作流：Design Agent (FSM) → HTML Agent → Playwright Agent
 *
 * 这个脚本实现了正确的生成顺序：
 * 1. Design Agent: 先设计详细的 FSM 规范
 * 2. HTML Agent: 根据 FSM 严格实现可视化
 * 3. Playwright Agent: 根据 FSM 规范生成测试
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";
import "dotenv/config";
import { v4 as uuidv4 } from "uuid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

// ==================== 1. Design Agent ====================

/**
 * Design Agent - 根据主题生成详细的 FSM 设计规范
 */
async function designFSM(topic, options = {}) {
  const { model = "gpt-4o", showProgress = false } = options;

  const systemPrompt = `You are an expert in designing interactive educational visualizations using finite state machines.

Your task is to design a comprehensive FSM specification for an algorithm visualization.

The FSM specification must include:
1. All possible states the visualization can be in
2. All events that trigger state transitions
3. Detailed UI requirements for each state
4. Data structure requirements
5. Validation and error handling rules
6. Acceptance criteria for testing

Output a detailed JSON specification following this structure:
{
  "topic": "Topic Name",
  "description": "What this visualization teaches",
  "dataStructure": {
    "type": "array | linkedList | tree | graph | etc",
    "initialValue": "...",
    "constraints": "max size, value ranges, etc"
  },
  "uiElements": {
    "required": ["element1", "element2"],
    "optional": ["element3"],
    "testIds": {
      "element1": "data-testid value"
    }
  },
  "states": [
    {
      "name": "idle",
      "description": "Initial state",
      "uiRequirements": {
        "visualization": "Show initial data",
        "controls": ["start button enabled", "input enabled"],
        "status": "Ready to start"
      },
      "dataRequirements": {
        "conditions": "Data must be valid",
        "display": "How to show data"
      },
      "on": {
        "START": "running",
        "INPUT_CHANGE": "idle"
      }
    }
  ],
  "events": [
    {
      "name": "START",
      "trigger": "User clicks start button",
      "validation": "Data must not be empty",
      "effect": "Begin algorithm animation"
    }
  ],
  "animations": {
    "comparison": "Highlight compared elements in yellow",
    "swap": "Animate swap with smooth transition",
    "complete": "Highlight final result in green"
  },
  "errorHandling": {
    "emptyInput": "Show error message, stay in idle",
    "invalidInput": "Show validation error, stay in idle"
  },
  "acceptanceCriteria": [
    "User can input custom data",
    "Animation can be started and paused",
    "Each step is visually clear",
    "Final result is correct"
  ]
}

CRITICAL: Output ONLY valid JSON, no markdown, no code blocks.`;

  const userPrompt = `Design a comprehensive FSM specification for: ${topic}

Requirements:
- The visualization must be interactive and educational
- Include all necessary states for a complete user experience
- Define clear acceptance criteria for testing
- Specify exact UI element requirements with test IDs
- Include error handling and edge cases

Generate the complete FSM specification now.`;

  if (showProgress) {
    console.log("\n[Design Agent] 🎨 开始设计 FSM 规范...\n");
  }

  const stream = await client.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    model: model,
    stream: true,
    temperature: 0.4,
    response_format: { type: "json_object" },
  });

  let fullContent = "";
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || "";
    if (content) {
      fullContent += content;
      if (showProgress) process.stdout.write(content);
    }
  }

  if (showProgress) {
    console.log("\n\n[Design Agent] ✅ FSM 设计完成！\n");
  }

  // 清理和解析 JSON
  let cleanedContent = fullContent.trim();
  cleanedContent = cleanedContent
    .replace(/^```json\s*/, "")
    .replace(/^```\s*/, "")
    .replace(/\s*```$/, "");

  const fsmSpec = JSON.parse(cleanedContent);

  if (showProgress) {
    console.log(
      `[Design Agent] 📊 FSM 包含: ${fsmSpec.states?.length || 0} 个状态, ${
        fsmSpec.events?.length || 0
      } 个事件`
    );
  }

  return fsmSpec;
}

// ==================== 2. HTML Agent ====================

/**
 * HTML Agent - 根据 FSM 规范严格实现可视化
 */
async function implementVisualization(fsmSpec, options = {}) {
  const { model = "gpt-4o", showProgress = false } = options;

  const systemPrompt = `You are an expert web developer specializing in implementing algorithm visualizations based on FSM specifications.

Your task is to create a complete, self-contained HTML file that implements the provided FSM specification.

MANDATORY REQUIREMENTS:

1. State Management:
   - Implement all states from the FSM specification
   - Store state in: window.appState = { current: 'idle', ... }
   - Update data-state attribute on root element when state changes
   - Emit custom event on state change: new CustomEvent('statechange', {detail: state})

2. DOM Structure:
   - Use exact data-testid values from FSM specification
   - Add data-state attribute to root element
   - Add data-action attributes to all buttons
   - Use semantic HTML5 elements

3. Required Global Functions (for testing):
   - window.getState() - returns current app state
   - window.setState(newState) - updates app state
   - window.reset() - resets to initial state

4. UI Elements:
   - Implement ALL required elements from FSM uiElements.required
   - Follow exact naming from FSM uiElements.testIds
   - Provide visual feedback for all state transitions

5. Event Handling:
   - Implement ALL events from FSM specification
   - Validate according to FSM event.validation rules
   - Handle errors as specified in FSM errorHandling

6. Animations:
   - Implement animations as specified in FSM animations
   - Use CSS transitions/animations
   - Ensure animations are smooth and educational

7. Accessibility:
   - ARIA labels for all interactive elements
   - Keyboard navigation support
   - Status announcements in role="status" element

CRITICAL: 
- Follow the FSM specification EXACTLY
- Do NOT add extra features not in the spec
- Do NOT omit required features from the spec
- Generate a complete, working HTML file
- No markdown, no code blocks, just valid HTML`;

  const userPrompt = `Implement this FSM specification as a complete HTML visualization:

FSM Specification:
${JSON.stringify(fsmSpec, null, 2)}

Generate a complete, self-contained HTML file that:
1. Implements ALL states from the specification
2. Implements ALL events and transitions
3. Includes ALL required UI elements with correct test IDs
4. Follows all animation specifications
5. Handles all error cases
6. Provides the required global functions for testing

The HTML must be production-ready and fully functional.`;

  if (showProgress) {
    console.log("\n[HTML Agent] 💻 开始实现可视化...\n");
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
      if (showProgress) process.stdout.write(content);
    }
  }

  if (showProgress) {
    console.log("\n\n[HTML Agent] ✅ HTML 实现完成！\n");
  }

  // 清理 markdown
  let cleanedContent = fullContent.trim();
  cleanedContent = cleanedContent
    .replace(/^```html\s*/, "")
    .replace(/^```\s*/, "")
    .replace(/\s*```$/, "");

  if (showProgress) {
    const lines = cleanedContent.split("\n").length;
    console.log(`[HTML Agent] 📄 生成了 ${lines} 行代码`);
  }

  return cleanedContent;
}

// ==================== 3. Playwright Agent ====================

/**
 * Playwright Agent - 根据 FSM 规范生成测试
 */
async function generateTests(fsmSpec, htmlContent, resultId, options = {}) {
  const {
    model = "gpt-4o",
    showProgress = false,
    workspace = "default",
  } = options;

  const systemPrompt = `You are an expert at writing comprehensive Playwright tests based on FSM specifications.

Your task is to generate tests that validate EVERY aspect of the FSM specification.

Test Requirements:

1. Test ID Usage - CRITICAL:
   - Extract test IDs as simple strings: const testIds = { startButton: 'start-button' }
   - ALWAYS use Playwright's getByTestId() method: page.getByTestId('start-button')
   - NEVER use attribute selectors like [data-testid="..."] or [\${testIds.startButton}]
   - Example: await page.getByTestId('start-button').click()
   - Example: await expect(page.getByTestId('status')).toBeVisible()

2. State Transition Tests:
   - Test EVERY state defined in the FSM
   - Test EVERY event/transition
   - Verify data-state attribute: await page.locator('[data-state="running"]').waitFor()
   - Use helper function: await waitForState(page, 'running')

3. UI Element Tests:
   - Verify ALL required elements exist: await expect(page.getByTestId('start-button')).toBeVisible()
   - Test element interactivity: await expect(page.getByTestId('start-button')).toBeEnabled()
   - Check disabled states: await expect(page.getByTestId('pause-button')).toBeDisabled()

4. Validation Tests:
   - Test ALL validation rules from FSM events
   - Test ALL error handling scenarios
   - Verify error messages: await expect(page.getByTestId('error-message')).toContainText('...')

5. Acceptance Criteria Tests:
   - Test EVERY acceptance criterion from the FSM
   - Each criterion should be a separate test case

6. Edge Case Tests:
   - Empty/invalid input
   - Boundary values
   - Rapid user interactions
   - State consistency after errors

7. Helper Functions - REQUIRED:
   - getCurrentState(page): returns window.getState().current
   - waitForState(page, stateName): waits for data-state attribute
   - waitForStateChange(page): waits for statechange event

Test Structure Template:
\`\`\`javascript
import { test, expect } from '@playwright/test';

const URL = 'http://127.0.0.1:5500/workspace/${workspace}/html/${resultId}.html';

// Store test IDs as simple strings (NOT full attributes)
const testIds = {
  startButton: 'start-button',
  pauseButton: 'pause-button',
  resetButton: 'reset-button',
  inputField: 'input-field',
  visualization: 'visualization',
  status: 'status'
};

// Helper: Get current state from window.getState()
async function getCurrentState(page) {
  return await page.evaluate(() => window.getState()?.current || 'unknown');
}

// Helper: Wait for specific state using data-state attribute
async function waitForState(page, stateName, timeout = 5000) {
  await page.locator(\`[data-state="\${stateName}"]\`).waitFor({ 
    state: 'attached',
    timeout 
  });
}

// Helper: Wait for state change event
async function waitForStateChange(page, timeout = 5000) {
  return await page.evaluate((t) => {
    return new Promise((resolve) => {
      const handler = (e) => {
        document.removeEventListener('statechange', handler);
        resolve(e.detail);
      };
      document.addEventListener('statechange', handler);
      setTimeout(() => resolve(null), t);
    });
  }, timeout);
}

test.describe('FSM Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(URL);
    await page.waitForLoadState('networkidle');
  });

  test('State transition from idle to running', async ({ page }) => {
    // Verify initial state
    let state = await getCurrentState(page);
    expect(state).toBe('idle');
    
    // Trigger transition - USE getByTestId()
    await page.getByTestId(testIds.startButton).click();
    
    // Wait for state change
    await waitForState(page, 'running');
    
    // Verify new state
    state = await getCurrentState(page);
    expect(state).toBe('running');
    
    // Verify UI updates
    await expect(page.getByTestId(testIds.startButton)).toBeDisabled();
    await expect(page.getByTestId(testIds.pauseButton)).toBeEnabled();
  });

  test('UI element exists and is visible', async ({ page }) => {
    await expect(page.getByTestId(testIds.startButton)).toBeVisible();
    await expect(page.getByTestId(testIds.visualization)).toBeVisible();
  });
});
\`\`\`

CRITICAL RULES:
- ALWAYS use page.getByTestId('test-id-value') 
- NEVER use [data-testid="..."] selectors
- NEVER use [\${testIds.something}] - this is invalid syntax
- Store test IDs as plain strings
- Add proper waits before assertions
- Use helper functions for state management
- Generate ONLY JavaScript code, no markdown wrapper, no code blocks markers.`;

  const userPrompt = `Generate comprehensive Playwright tests for this FSM specification.

FSM Specification:
${JSON.stringify(fsmSpec, null, 2)}

Test File Configuration:
- File name: ${resultId}.spec.js
- HTML URL: http://127.0.0.1:5500/workspace/${workspace}/html/${resultId}.html
- Use test IDs from FSM uiElements.testIds

Requirements:
1. Test ALL ${fsmSpec.states?.length || 0} states
2. Test ALL ${fsmSpec.events?.length || 0} events
3. Test ALL ${fsmSpec.acceptanceCriteria?.length || 0} acceptance criteria
4. Test ALL error handling scenarios
5. Include edge case tests
6. Use page.waitForSelector() with test IDs
7. Use page.evaluate() to check window.getState()
8. Listen for statechange events

Generate the complete test file now.`;

  if (showProgress) {
    console.log("\n[Playwright Agent] 🧪 开始生成测试...\n");
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
      if (showProgress) process.stdout.write(content);
    }
  }

  if (showProgress) {
    console.log("\n\n[Playwright Agent] ✅ 测试生成完成！\n");
  }

  // 清理 markdown
  let cleanedContent = fullContent.trim();
  cleanedContent = cleanedContent
    .replace(/^```javascript\s*/, "")
    .replace(/^```js\s*/, "")
    .replace(/^```\s*/, "")
    .replace(/\s*```$/, "");

  if (showProgress) {
    const testCount = (cleanedContent.match(/test\(/g) || []).length;
    console.log(`[Playwright Agent] 🎯 生成了 ${testCount} 个测试用例`);
  }

  return cleanedContent;
}

// ==================== Main Workflow ====================

async function runNewWorkflow(topic, options = {}) {
  const {
    model = "gpt-5-mini",
    showProgress = true,
    workspace = "new-workflow-test",
  } = options;

  console.log("\n" + "=".repeat(70));
  console.log("🚀 新工作流：Design → Implement → Test");
  console.log("=".repeat(70));
  console.log(`📝 主题: ${topic}`);
  console.log(`🤖 模型: ${model}`);
  console.log(`📁 工作空间: ${workspace}`);
  console.log("=".repeat(70) + "\n");

  const startTime = Date.now();
  const resultId = uuidv4();

  try {
    // Step 1: Design FSM
    console.log("📍 Step 1/3: Design Agent - 设计 FSM 规范");
    const fsmSpec = await designFSM(topic, { model, showProgress });

    // Step 2: Implement HTML
    console.log("\n📍 Step 2/3: HTML Agent - 实现可视化");
    const htmlContent = await implementVisualization(fsmSpec, {
      model,
      showProgress,
    });

    // Step 3: Generate Tests
    console.log("\n📍 Step 3/3: Playwright Agent - 生成测试");
    const testCode = await generateTests(fsmSpec, htmlContent, resultId, {
      model,
      showProgress,
      workspace,
    });

    // Save outputs
    const workspaceDir = path.join(__dirname, "workspace", workspace);
    const htmlDir = path.join(workspaceDir, "html");
    const fsmDir = path.join(workspaceDir, "fsm");
    const testsDir = path.join(workspaceDir, "tests");

    [htmlDir, fsmDir, testsDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    // Save FSM
    const fsmPath = path.join(fsmDir, `${resultId}.json`);
    fs.writeFileSync(fsmPath, JSON.stringify(fsmSpec, null, 2));

    // Save HTML
    const safeTopic = topic
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const htmlFilename = `${resultId}.html`;
    const htmlPath = path.join(htmlDir, htmlFilename);
    fs.writeFileSync(htmlPath, htmlContent);

    // Save Tests
    const testFilename = `${resultId}.spec.js`;
    const testPath = path.join(testsDir, testFilename);
    fs.writeFileSync(testPath, testCode);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log("\n" + "=".repeat(70));
    console.log("✅ 工作流完成！");
    console.log("=".repeat(70));
    console.log(`⏱️  耗时: ${elapsed}s`);
    console.log(`📄 FSM: ${fsmPath}`);
    console.log(`🌐 HTML: ${htmlPath}`);
    console.log(`🧪 Tests: ${testPath}`);
    console.log("\n💡 下一步:");
    console.log(`   1. 打开 HTML: open ${htmlPath}`);
    console.log(`   2. 运行测试: npx playwright test ${testPath}`);
    console.log("=".repeat(70) + "\n");

    return {
      success: true,
      resultId,
      fsmSpec,
      htmlPath,
      testPath,
      elapsed,
    };
  } catch (error) {
    console.error("\n❌ 工作流失败:", error.message);
    console.error(error.stack);
    return {
      success: false,
      error: error.message,
    };
  }
}

// ==================== CLI ====================

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const topic = process.argv[2];
  const workspace = process.argv[3] || "new-workflow-test";

  if (!topic) {
    console.error("用法: node new-workflow.mjs <topic> [workspace]");
    console.error(
      "示例: node new-workflow.mjs 'Bubble Sort Algorithm' 11-18-test"
    );
    process.exit(1);
  }

  runNewWorkflow(topic, { workspace })
    .then((result) => {
      if (!result.success) {
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error("Fatal error:", error);
      process.exit(1);
    });
}

export { designFSM, implementVisualization, generateTests, runNewWorkflow };
