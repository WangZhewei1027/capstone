#!/usr/bin/env node
/**
 * Batch.mjs - 批量执行工作流的脚本
 *
 * 功能：
 * 1. 批量生成多个算法可视化
 * 2. 支持不同模型对比测试
 * 3. 自动执行测试和生成报告
 * 4. 统计分析和结果导出
 */

import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import process from "node:process";
import { promises as fs } from "fs";
import { runWorkflow } from "./workflow.mjs";
import { modelList } from "./lib/add-core.mjs";

// ==================== 配置和模板 ====================

/**
 * 预定义的算法可视化任务
 */
const ALGORITHM_TASKS = [
  {
    id: "bubble-sort",
    question:
      "创建一个冒泡排序算法的交互式可视化，支持步进执行、暂停、重置功能，显示比较和交换过程",
    topic: "Bubble Sort",
    category: "sorting",
  },
  {
    id: "selection-sort",
    question: "创建选择排序算法可视化，突出显示当前最小元素查找过程和交换操作",
    topic: "Selection Sort",
    category: "sorting",
  },
  {
    id: "insertion-sort",
    question:
      "创建插入排序可视化，展示元素插入到已排序部分的过程，支持动画演示",
    topic: "Insertion Sort",
    category: "sorting",
  },
  {
    id: "quick-sort",
    question: "创建快速排序可视化，显示分区过程、递归调用栈和pivot选择",
    topic: "Quick Sort",
    category: "sorting",
  },
  {
    id: "merge-sort",
    question: "创建归并排序可视化，展示分治过程和合并操作，支持递归层级显示",
    topic: "Merge Sort",
    category: "sorting",
  },
  {
    id: "binary-search",
    question: "创建二分查找算法可视化，显示搜索区间缩小过程和目标查找",
    topic: "Binary Search",
    category: "search",
  },
  {
    id: "linear-search",
    question: "创建线性查找可视化，逐个元素检查过程，突出显示当前检查位置",
    topic: "Linear Search",
    category: "search",
  },
  {
    id: "bfs",
    question: "创建广度优先搜索(BFS)图遍历可视化，显示队列状态和访问顺序",
    topic: "BFS",
    category: "graph",
  },
  {
    id: "dfs",
    question: "创建深度优先搜索(DFS)图遍历可视化，显示栈状态和递归过程",
    topic: "DFS",
    category: "graph",
  },
  {
    id: "dijkstra",
    question: "创建Dijkstra最短路径算法可视化，显示距离更新和路径构建过程",
    topic: "Dijkstra",
    category: "graph",
  },
];

/**
 * 模型对比配置
 */
const MODEL_COMPARISONS = [
  {
    name: "gpt-models",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"],
    description: "OpenAI GPT 系列模型对比",
  },
  {
    name: "claude-vs-gpt",
    models: ["claude-3-5-sonnet-20241022", "gpt-4o"],
    description: "Claude vs GPT-4 对比",
  },
  {
    name: "budget-models",
    models: ["gpt-4o-mini", "gpt-3.5-turbo"],
    description: "经济型模型对比",
  },
];

// ==================== 用户界面函数 ====================

async function userInput(query) {
  const rl = createInterface({ input, output });
  try {
    return await rl.question(query);
  } finally {
    rl.close();
  }
}

function showHelp() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════╗
║  Batch.mjs - 批量工作流执行工具                                        ║
╚════════════════════════════════════════════════════════════════════════╝

使用方法: node batch.mjs [选项]

基本选项:
  -w, --workspace <name>    工作空间名称 (默认: batch-TIMESTAMP)
  -m, --model <model>       统一使用的模型
  -t, --tasks <ids>         任务ID列表，逗号分隔 (默认: 全部)
  -c, --compare <name>      模型对比测试名称
  --dry-run                 仅显示将要执行的任务，不实际执行
  --skip-tests             跳过Playwright测试执行
  --parallel <n>           并行执行数量 (默认: 3)
  -h, --help               显示帮助信息

模式:
  1. 单模型批量生成:
     node batch.mjs -m gpt-4o -t bubble-sort,quick-sort

  2. 模型对比测试:  
     node batch.mjs -c gpt-models -t bubble-sort

  3. 全算法测试:
     node batch.mjs -m gpt-4o

  4. 自定义任务:
     node batch.mjs --interactive

═══════════════════════════════════════════════════════════════════════

📋 可用算法任务:
${ALGORITHM_TASKS.map((task) => `  ${task.id.padEnd(15)} - ${task.topic}`).join(
  "\n"
)}

🔄 可用模型对比:
${MODEL_COMPARISONS.map(
  (comp) => `  ${comp.name.padEnd(15)} - ${comp.description}`
).join("\n")}

🤖 可用模型:
${modelList.map((model, index) => `  ${index + 1}. ${model}`).join("\n")}

═══════════════════════════════════════════════════════════════════════
`);
}

// ==================== 核心执行函数 ====================

/**
 * 单个任务执行
 */
async function executeTask(task, config) {
  const { workspace, model, htmlModel, fsmModel, testModel } = config;

  console.log(`\n🚀 开始任务: ${task.topic} (${task.id})`);
  console.log(`   模型: ${model || "Multi-Model"}`);
  console.log(`   工作空间: ${workspace}`);

  const startTime = Date.now();

  try {
    const result = await runWorkflow(
      {
        question: task.question,
        workspace,
        model: model || htmlModel,
        topic: task.topic,
        models: {
          html: htmlModel,
          fsm: fsmModel,
          playwright: testModel,
        },
      },
      {
        showProgress: false, // 批量模式下关闭详细进度
        enableFSM: true,
        enableTests: true,
        taskId: task.id,
      }
    );

    const duration = Date.now() - startTime;

    if (result.success) {
      console.log(`✅ ${task.topic} 完成 (${duration}ms)`);
      console.log(`   HTML: ${result.htmlUrl}`);
      if (result.testFileName) {
        console.log(`   测试: ${result.testFileName}`);
      }

      return {
        taskId: task.id,
        status: "success",
        duration,
        resultId: result.resultId,
        htmlUrl: result.htmlUrl,
        testFileName: result.testFileName,
        hasFSM: !!result.fsmData,
        hasTest: !!result.testCode,
      };
    } else {
      console.error(`❌ ${task.topic} 失败: ${result.error}`);
      return {
        taskId: task.id,
        status: "error",
        duration,
        error: result.error,
      };
    }
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`💥 ${task.topic} 异常: ${err.message}`);
    return {
      taskId: task.id,
      status: "exception",
      duration,
      error: err.message,
    };
  }
}

/**
 * 批量执行任务
 */
async function executeBatch(tasks, config) {
  const { parallel = 3 } = config;
  const results = [];

  console.log(`\n📊 开始批量执行 ${tasks.length} 个任务 (并行度: ${parallel})`);

  // 分批执行
  for (let i = 0; i < tasks.length; i += parallel) {
    const batch = tasks.slice(i, i + parallel);
    const batchPromises = batch.map((task) => executeTask(task, config));

    console.log(
      `\n🔄 执行批次 ${Math.floor(i / parallel) + 1}/${Math.ceil(
        tasks.length / parallel
      )}`
    );
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // 批次间短暂停顿，避免API限制
    if (i + parallel < tasks.length) {
      console.log("⏸️  批次间休息 2 秒...");
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  return results;
}

/**
 * 执行Playwright测试
 */
async function runPlaywrightTests(workspace, results) {
  console.log(`\n🧪 执行 Playwright 测试...`);

  try {
    const { spawn } = await import("child_process");

    return new Promise((resolve, reject) => {
      const testProcess = spawn(
        "npx",
        [
          "playwright",
          "test",
          `workspace/${workspace}/tests/`,
          "--reporter=json",
        ],
        {
          stdio: ["pipe", "pipe", "pipe"],
        }
      );

      let stdout = "";
      let stderr = "";

      testProcess.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      testProcess.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      testProcess.on("close", (code) => {
        if (code === 0) {
          console.log("✅ Playwright 测试完成");
          try {
            const testResults = JSON.parse(stdout);
            resolve(testResults);
          } catch (err) {
            resolve({ summary: "Parse error", raw: stdout });
          }
        } else {
          console.error(`⚠️  Playwright 测试退出码: ${code}`);
          console.error(stderr);
          resolve({ error: stderr, code });
        }
      });

      testProcess.on("error", (err) => {
        reject(err);
      });
    });
  } catch (err) {
    console.error("❌ Playwright 测试执行失败:", err.message);
    return { error: err.message };
  }
}

/**
 * 生成结果报告
 */
async function generateReport(results, testResults, config) {
  const { workspace } = config;

  const summary = {
    workspace,
    timestamp: new Date().toISOString(),
    config,
    totalTasks: results.length,
    successful: results.filter((r) => r.status === "success").length,
    failed: results.filter((r) => r.status !== "success").length,
    averageDuration:
      results.reduce((acc, r) => acc + r.duration, 0) / results.length,
    results,
    testResults,
  };

  // 保存详细报告
  const reportPath = `./workspace/${workspace}/batch-report.json`;
  await fs.mkdir(`./workspace/${workspace}`, { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify(summary, null, 2));

  // 生成简要报告
  console.log(`\n${"═".repeat(70)}`);
  console.log("📊 批量执行报告");
  console.log(`${"═".repeat(70)}`);
  console.log(`工作空间: ${workspace}`);
  console.log(`总任务数: ${summary.totalTasks}`);
  console.log(
    `成功数量: ${summary.successful} (${(
      (summary.successful / summary.totalTasks) *
      100
    ).toFixed(1)}%)`
  );
  console.log(`失败数量: ${summary.failed}`);
  console.log(`平均耗时: ${(summary.averageDuration / 1000).toFixed(1)} 秒`);

  if (testResults && testResults.summary) {
    console.log(`测试结果: ${JSON.stringify(testResults.summary)}`);
  }

  console.log(`\n📄 详细报告: ${reportPath}`);
  console.log(`${"═".repeat(70)}\n`);

  return summary;
}

// ==================== 主流程 ====================

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    workspace: null,
    model: null,
    tasks: null,
    compare: null,
    dryRun: false,
    skipTests: false,
    parallel: 3,
    interactive: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--workspace":
      case "-w":
        parsed.workspace = args[++i];
        break;
      case "--model":
      case "-m":
        parsed.model = args[++i];
        break;
      case "--tasks":
      case "-t":
        parsed.tasks = args[++i]?.split(",").map((s) => s.trim());
        break;
      case "--compare":
      case "-c":
        parsed.compare = args[++i];
        break;
      case "--dry-run":
        parsed.dryRun = true;
        break;
      case "--skip-tests":
        parsed.skipTests = true;
        break;
      case "--parallel":
        parsed.parallel = parseInt(args[++i]) || 3;
        break;
      case "--interactive":
        parsed.interactive = true;
        break;
      case "--help":
      case "-h":
        parsed.help = true;
        break;
    }
  }

  return parsed;
}

async function main() {
  try {
    const args = parseArgs();

    if (args.help) {
      showHelp();
      return;
    }

    // 生成工作空间名称
    const workspace =
      args.workspace ||
      `batch-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}`;

    // 确定要执行的任务
    let tasksToRun = ALGORITHM_TASKS;
    if (args.tasks) {
      const taskIds = args.tasks;
      tasksToRun = ALGORITHM_TASKS.filter((task) => taskIds.includes(task.id));
      if (tasksToRun.length === 0) {
        console.error("❌ 未找到指定的任务ID");
        process.exit(1);
      }
    }

    // 模型对比模式
    if (args.compare) {
      const comparison = MODEL_COMPARISONS.find((c) => c.name === args.compare);
      if (!comparison) {
        console.error(`❌ 未找到模型对比配置: ${args.compare}`);
        process.exit(1);
      }

      console.log(`🔄 执行模型对比: ${comparison.description}`);

      for (const model of comparison.models) {
        console.log(`\n${"─".repeat(50)}`);
        console.log(`📊 测试模型: ${model}`);
        console.log(`${"─".repeat(50)}`);

        const modelWorkspace = `${workspace}-${model.replace(
          /[^a-zA-Z0-9]/g,
          "-"
        )}`;

        if (args.dryRun) {
          console.log(
            `🎭 [DRY RUN] 将在工作空间 ${modelWorkspace} 中执行 ${tasksToRun.length} 个任务`
          );
          continue;
        }

        const config = {
          workspace: modelWorkspace,
          model,
          parallel: args.parallel,
        };

        const results = await executeBatch(tasksToRun, config);

        if (!args.skipTests) {
          const testResults = await runPlaywrightTests(modelWorkspace, results);
          await generateReport(results, testResults, config);
        } else {
          await generateReport(results, null, config);
        }
      }

      return;
    }

    // 单模型模式
    if (args.dryRun) {
      console.log(
        `🎭 [DRY RUN] 将在工作空间 ${workspace} 中执行 ${tasksToRun.length} 个任务`
      );
      tasksToRun.forEach((task) => {
        console.log(`  - ${task.id}: ${task.topic}`);
      });
      return;
    }

    const config = {
      workspace,
      model: args.model,
      parallel: args.parallel,
    };

    const results = await executeBatch(tasksToRun, config);

    if (!args.skipTests) {
      const testResults = await runPlaywrightTests(workspace, results);
      await generateReport(results, testResults, config);
    } else {
      await generateReport(results, null, config);
    }

    console.log(`🎉 批量执行完成！查看工作空间: workspace/${workspace}`);
  } catch (err) {
    console.error("\n❌ 批量执行失败:");
    console.error(err.message);
    if (process.env.DEBUG) {
      console.error(err.stack);
    }
    process.exit(1);
  }
}

// 执行主函数
if (process.argv[1] === new URL(import.meta.url).pathname) {
  main();
}

export { executeBatch, executeTask, generateReport };
