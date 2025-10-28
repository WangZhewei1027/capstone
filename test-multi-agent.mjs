import { processTask } from "./lib/add-core.mjs";

console.log("======================================");
console.log("  多 Agent 系统测试");
console.log("======================================\n");

// 简单的测试任务
const testTask = {
  workspace: "test-multi-agent",
  model: "gpt-4o-mini",
  question: `Create a simple interactive counter application with these features:
- A display showing the current count (starting at 0)
- A "+" button to increment
- A "-" button to decrement
- A "Reset" button to reset to 0
- Clean, modern styling with smooth transitions

Keep it simple and self-contained in a single HTML file.`,
  system:
    "You are an expert in creating interactive web applications. Only respond with a single HTML file.",
  topic: "Interactive Counter", // 主题用于 FSM 生成
};

console.log("测试配置:");
console.log(`- 工作空间: ${testTask.workspace}`);
console.log(`- 模型: ${testTask.model}`);
console.log(`- 主题: ${testTask.topic}`);
console.log(`- 启用多 Agent: ✓\n`);

async function runTest() {
  const startTime = Date.now();

  try {
    console.log("开始执行多 Agent 流程...\n");

    const result = await processTask(testTask, {
      showProgress: true,
      taskId: "MultiAgent-Test",
      enableFSM: true, // 启用 FSM 生成
    });

    const duration = Date.now() - startTime;

    console.log("\n" + "=".repeat(50));
    console.log("测试结果:");
    console.log("=".repeat(50));
    console.log(`状态: ${result.success ? "✓ 成功" : "✗ 失败"}`);
    console.log(`总耗时: ${(duration / 1000).toFixed(2)}s`);

    if (result.success) {
      console.log(`结果 ID: ${result.resultId}`);
      console.log(`包含 FSM: ${result.hasFSM ? "✓ 是" : "✗ 否"}`);

      if (result.hasFSM && result.fsmData) {
        console.log(`\nFSM 信息:`);
        console.log(`  - 主题: ${result.fsmData.topic || "N/A"}`);
        console.log(`  - 状态数: ${result.fsmData.states?.length || 0}`);
        console.log(`  - 事件数: ${result.fsmData.events?.length || 0}`);

        if (result.fsmData.states && result.fsmData.states.length > 0) {
          console.log(`\n  状态列表:`);
          result.fsmData.states.forEach((state, i) => {
            console.log(`    ${i + 1}. ${state.name}`);
          });
        }

        if (result.fsmData.events && result.fsmData.events.length > 0) {
          console.log(`\n  事件列表:`);
          result.fsmData.events.forEach((event, i) => {
            console.log(`    ${i + 1}. ${event}`);
          });
        }
      }

      console.log(`\n查看地址: ${result.url}`);
      console.log(
        `\n提示: 打开生成的 HTML 文件，查看底部的 <script id="fsm"> 标签`
      );
    } else {
      console.log(`错误: ${result.error}`);
    }

    console.log("=".repeat(50));
  } catch (error) {
    console.error("\n测试失败:", error);
    console.error("错误详情:", error.message);
  }
}

runTest().catch(console.error);
