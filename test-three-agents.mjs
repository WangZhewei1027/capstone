import { processTask } from "./lib/add-core.mjs";

// 简单的测试任务 - 计数器应用
const task = {
  workspace: "test-agents",
  model: "gpt-4o-mini",
  question: `Create a simple interactive counter application with increment and decrement buttons. 
  The counter should start at 0 and update when buttons are clicked.`,
  system:
    "You are an expert in interactive web design. Create a single, self-contained HTML file.",
  topic: "Counter Application",
};

console.log("========================================");
console.log("测试三个 Agent 协同工作");
console.log("========================================");
console.log("任务: 生成计数器应用");
console.log("- Agent 1: HTML 生成");
console.log("- Agent 2: FSM 生成");
console.log("- Agent 3: Playwright 测试生成");
console.log("========================================\n");

const startTime = Date.now();

try {
  const result = await processTask(task, {
    showProgress: true,
    taskId: "THREE-AGENTS-TEST",
    enableFSM: true,
    enableTests: true,
  });

  const duration = Date.now() - startTime;

  console.log("\n========================================");
  console.log("测试完成");
  console.log("========================================");
  console.log(`总耗时: ${(duration / 1000).toFixed(2)}s`);
  console.log(`结果ID: ${result.resultId}`);
  console.log(
    `HTML 文件: workspace/${task.workspace}/html/${result.resultId}.html`
  );

  if (result.hasFSM && result.fsmData) {
    console.log(`\nFSM 信息:`);
    console.log(`- 状态数: ${result.fsmData.states?.length || 0}`);
    console.log(`- 事件数: ${result.fsmData.events?.length || 0}`);
    console.log(`- 主题: ${result.fsmData.topic || "N/A"}`);
  }

  if (result.hasTest) {
    console.log(`\n测试文件信息:`);
    console.log(
      `- 文件路径: workspace/${task.workspace}/tests/${result.testFileName}`
    );
    console.log(`- 文件名: ${result.testFileName}`);
  }

  console.log("\n所有三个 Agent 成功协同工作! ✓");
} catch (error) {
  console.error("\n测试失败:", error);
  process.exit(1);
}
