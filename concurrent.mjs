import { processTask } from "./lib/add-core.mjs";
import { ConcurrencyLimiter } from "./lib/concurrency-limiter.mjs";
import questionList from "./question-list.json" assert { type: "json" };

// 简单的测试配置
const TEST_CONFIG = {
  workspace: "10-28-0002",
  concurrencyLimit: 25,
  systemPrompt: "Create a simple HTML page. Only respond with HTML code.",
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

const testTasks = questionList.map((q) => ({
  workspace: TEST_CONFIG.workspace,
  model: "gpt-5",
  question: q,
  system: TEST_CONFIG.systemPrompt,
}));

console.log("开始并发测试...");
console.log(
  `任务数量: ${testTasks.length}, 并发限制: ${TEST_CONFIG.concurrencyLimit}`
);

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
          showProgress: false, // 测试时关闭详细输出
          taskId: taskId,
        });

        const duration = Date.now() - taskStart;
        console.log(
          `[${taskId}] 完成 - 耗时: ${(duration / 1000).toFixed(2)}s`
        );

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

  // 显示成功的任务链接
  const successTasks = results.filter((r) => r.success);
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
