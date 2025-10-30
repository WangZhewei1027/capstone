import { processTask } from "./lib/add-core.mjs";
import { ConcurrencyLimiter } from "./lib/concurrency-limiter.mjs";
import questionList from "./question-list.json" assert { type: "json" };

/**
 * 根据 topic 生成 system prompt
 * @param {string} topic - 主题名称
 * @returns {string} 生成的 system prompt
 */
function generateSystemPrompt(topic) {
  return `You are an expert in interactive web design and front-end pedagogy. Please design a **high-quality interactive HTML page** that provides an in-depth, hands-on exploration of ${topic}.

**Project Overview:**
Topic: ${topic}

**Interactive Design Plan:**

Please plan the HTML interface as a **single interactive module** that teaches or demonstrates this concept.

For this module, include the following sections:

*   **Concept Title:** A concise title describing the main idea.
*   **Learning Objective:** What users should understand or experience after interacting with the module.
*   **Interaction Design:** Describe in detail how the user interacts with the page (clicking, dragging, typing, etc.), what changes occur in response (animations, visual updates, state changes), and how these reinforce understanding of the concept.
*   **Layout Description:** Explain the spatial organization — placement of text, controls, and visuals — including how you will maintain clarity, focus, and balance.  
    - Safe area margins: **24 px** on all sides of the viewport.  
    - Minimum spacing: **16 px** between any two interactive elements.  
    - Ensure accessibility and responsiveness.

**Requirements:**
1. The design should explain **only one concept** clearly and interactively.  
2. The page must include **at least one form of visual feedback or animation** responding to user input.  
3. The implementation must be **self-contained** — using only vanilla HTML, CSS, and JavaScript (no external libraries or assets).  
4. Maintain consistent code formatting and indentation.`;
}

// 简单的测试配置
const TEST_CONFIG = {
  workspace: "10-28-0007",
  concurrencyLimit: 15,
  defaultTopic: "bubble sort", // 默认主题
  enableFSM: true, // 启用 FSM 生成（Agent 2）
  enableTests: true, // 启用 Playwright 测试生成（Agent 3）
  showProgress: false, // 是否显示详细进度

  // 每个 Agent 使用的模型配置
  models: {
    htmlAgent: "gpt-4o-mini", // Agent 1: HTML 生成
    fsmAgent: "gpt-4o-mini", // Agent 2: FSM 生成
    testAgent: "gpt-4o-mini", // Agent 3: 测试生成
  },
};

// 创建测试任务
// const testTasks = [
//   {
//     workspace: TEST_CONFIG.workspace,
//     model: "gpt-4o-mini",
//     question: "Create a simple red button that says 'Click me!'",
//     system: TEST_CONFIG.systemPrompt,
//   },
//   {
//     workspace: TEST_CONFIG.workspace,
//     model: "gpt-4o-mini",
//     question: "Create a simple blue div with the text 'Hello World'",
//     system: TEST_CONFIG.systemPrompt,
//   },
//   {
//     workspace: TEST_CONFIG.workspace,
//     model: "gpt-4o-mini",
//     question: "Create a simple form with a text input and submit button",
//     system: TEST_CONFIG.systemPrompt,
//   },
// ];

const testTasks = questionList.map((q) => {
  // 从问题中提取 topic，或使用默认 topic
  const topic = q || TEST_CONFIG.defaultTopic;

  return {
    workspace: TEST_CONFIG.workspace,
    model: TEST_CONFIG.models.htmlAgent, // 使用配置的 HTML Agent 模型
    question: q.question || q, // 支持字符串或对象格式
    system: generateSystemPrompt(topic), // 根据 topic 生成 system prompt
    topic: null, // 不指定 topic，测试文件名只使用 UUID
    // 传递所有 Agent 的模型配置
    models: TEST_CONFIG.models,
  };
});

console.log("开始并发测试...");
console.log(
  `任务数量: ${testTasks.length}, 并发限制: ${TEST_CONFIG.concurrencyLimit}`
);
console.log(`Multi-Agent 模式:`);
console.log(`  - Agent 1 (HTML 生成): ✓ [${TEST_CONFIG.models.htmlAgent}]`);
console.log(
  `  - Agent 2 (FSM 生成): ${TEST_CONFIG.enableFSM ? "✓" : "✗"} ${
    TEST_CONFIG.enableFSM ? `[${TEST_CONFIG.models.fsmAgent}]` : ""
  }`
);
console.log(
  `  - Agent 3 (测试生成): ${TEST_CONFIG.enableTests ? "✓" : "✗"} ${
    TEST_CONFIG.enableTests ? `[${TEST_CONFIG.models.testAgent}]` : ""
  }`
);
console.log("");

async function runTest() {
  const limiter = new ConcurrencyLimiter(TEST_CONFIG.concurrencyLimit);
  const results = [];
  const startTime = Date.now();

  // 创建并发任务
  const taskPromises = testTasks.map((task, index) => {
    const taskId = `Test-${index + 1}`;

    return limiter.add(async () => {
      console.log(`[${taskId}] 开始执行...`);
      const taskStart = Date.now();

      try {
        const result = await processTask(task, {
          showProgress: TEST_CONFIG.showProgress,
          taskId: taskId,
          enableFSM: TEST_CONFIG.enableFSM,
          enableTests: TEST_CONFIG.enableTests,
        });

        const duration = Date.now() - taskStart;
        console.log(
          `[${taskId}] 完成 - 耗时: ${(duration / 1000).toFixed(2)}s`
        );

        // 显示生成的内容
        if (result.hasFSM) {
          console.log(
            `[${taskId}] ✓ FSM (${result.fsmData?.states?.length || 0} 个状态)`
          );
        }
        if (result.hasTest) {
          console.log(`[${taskId}] ✓ 测试 (${result.testFileName})`);
        }

        return { taskId, success: true, result, duration };
      } catch (error) {
        const duration = Date.now() - taskStart;
        console.error(
          `[${taskId}] 失败 - 耗时: ${(duration / 1000).toFixed(2)}s`
        );
        console.error(`[${taskId}] 错误: ${error.message}`);

        return { taskId, success: false, error: error.message, duration };
      }
    });
  });

  // 等待所有任务完成
  for (const promise of taskPromises) {
    try {
      const result = await promise;
      results.push(result);
    } catch (error) {
      console.error("任务执行错误:", error);
      results.push({ success: false, error: error.message });
    }
  }

  const totalTime = Date.now() - startTime;

  // 输出结果
  console.log("\n" + "=".repeat(50));
  console.log("测试完成!");
  console.log(`总耗时: ${(totalTime / 1000).toFixed(2)}s`);
  console.log(
    `成功: ${results.filter((r) => r.success).length}/${results.length}`
  );
  console.log(
    `失败: ${results.filter((r) => !r.success).length}/${results.length}`
  );

  // 统计 FSM 和测试生成情况
  const successTasks = results.filter((r) => r.success);
  if (successTasks.length > 0) {
    const fsmCount = successTasks.filter((r) => r.result?.hasFSM).length;
    const testCount = successTasks.filter((r) => r.result?.hasTest).length;

    console.log("\nMulti-Agent 统计:");
    console.log(`  - HTML 生成: ${successTasks.length}`);
    console.log(`  - FSM 生成: ${fsmCount}`);
    console.log(`  - 测试生成: ${testCount}`);
  }

  // 显示成功的任务链接
  if (successTasks.length > 0) {
    console.log("\n成功生成的文件:");
    successTasks.forEach((t) => {
      if (t.result && t.result.url) {
        console.log(`  [${t.taskId}] ${t.result.url}`);
      }
    });
  }
}

runTest().catch(console.error);
