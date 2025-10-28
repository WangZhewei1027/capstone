import { processTask } from "./lib/add-core.mjs";
import { ConcurrencyLimiter } from "./lib/concurrency-limiter.mjs";
import questionList from "./question-list.json" assert { type: "json" };

// 配置参数
const CONFIG = {
  workspace: "10-14-0001",
  concurrencyLimit: 3, // 并发数量
  systemPrompt:
    "You are an expert in interactive web design and front-end pedagogy. Only respond in a single HTML file.",
  showProgress: true, // 是否显示详细进度
  enableFSM: true, // 是否启用 FSM 生成（多 Agent 模式）
  enableTests: false, // 是否启用 Playwright 测试生成（需要先启用 enableFSM）
};

const concept = "bubble sort";

const question = `
You are an expert in interactive web design and front-end pedagogy. Please design a **high-quality interactive HTML page** that provides an in-depth, hands-on exploration of ${concept}.

**Project Overview:**
Topic: ${concept}  

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

// 定义任务列表
const tasks = [
  {
    workspace: CONFIG.workspace,
    model: "gpt-4o",
    question: question,
    system: CONFIG.systemPrompt,
    topic: concept, // 添加主题，用于 FSM 生成
  },
  // 可以添加更多任务
];

console.log(
  `批处理开始 - 总任务数: ${tasks.length}, 并发限制: ${CONFIG.concurrencyLimit}`
);
console.log("=".repeat(80));

async function runBatch() {
  const limiter = new ConcurrencyLimiter(CONFIG.concurrencyLimit);
  const results = [];

  // 创建任务 promise 数组
  const taskPromises = tasks.map((task, index) => {
    const taskId = `Task-${index + 1}`;

    return limiter.add(async () => {
      const startTime = Date.now();

      try {
        const result = await processTask(task, {
          showProgress: CONFIG.showProgress,
          taskId: taskId,
          enableFSM: CONFIG.enableFSM, // 传递 FSM 配置
          enableTests: CONFIG.enableTests, // 传递测试生成配置
        });

        const duration = Date.now() - startTime;
        console.log(
          `[${taskId}] 完成 - 耗时: ${(duration / 1000).toFixed(2)}s`
        );

        // 显示 FSM 状态
        if (result.hasFSM) {
          console.log(
            `[${taskId}] ✓ 包含 FSM (${
              result.fsmData?.states?.length || 0
            } 个状态)`
          );
        }

        // 显示测试生成状态
        if (result.hasTest) {
          console.log(`[${taskId}] ✓ 包含测试 (${result.testFileName})`);
        }

        return {
          taskId,
          task,
          result,
          duration,
          success: true,
        };
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(
          `[${taskId}] 失败 - 耗时: ${(duration / 1000).toFixed(2)}s, 错误: ${
            error.message
          }`
        );

        return {
          taskId,
          task,
          error: error.message,
          duration,
          success: false,
        };
      }
    });
  });

  // 等待所有任务完成
  const startTime = Date.now();

  for (const promise of taskPromises) {
    try {
      const result = await promise;
      results.push(result);
    } catch (error) {
      console.error("任务执行错误:", error);
      results.push({
        error: error.message,
        success: false,
      });
    }
  }

  const totalDuration = Date.now() - startTime;

  // 输出统计结果
  console.log("\n" + "=".repeat(80));
  console.log("批处理完成统计:");
  console.log(`总耗时: ${(totalDuration / 1000).toFixed(2)}s`);
  console.log(
    `成功任务: ${results.filter((r) => r.success).length}/${results.length}`
  );
  console.log(
    `失败任务: ${results.filter((r) => !r.success).length}/${results.length}`
  );

  const successResults = results.filter((r) => r.success);
  if (successResults.length > 0) {
    console.log("\n成功的任务:");
    successResults.forEach((r) => {
      if (r.result && r.result.url) {
        console.log(`  [${r.taskId}] ${r.result.url}`);
      }
    });
  }

  const failedResults = results.filter((r) => !r.success);
  if (failedResults.length > 0) {
    console.log("\n失败的任务:");
    failedResults.forEach((r) => {
      console.log(`  [${r.taskId}] ${r.error || "未知错误"}`);
    });
  }

  return results;
}

// 运行批处理
runBatch().catch(console.error);
