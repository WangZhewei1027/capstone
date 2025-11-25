#!/usr/bin/env node
/**
 * Batch Workflow - 批量并发执行 HTML → FSM → Playwright 工作流
 *
 * 从 question-list.json 读取问题列表，并发调用 workflow 生成可视化
 */

import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { runWorkflow } from "./workflow.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 并发限制器 - 控制同时运行的任务数量
 */
class ConcurrencyLimiter {
  constructor(limit = 3) {
    this.limit = limit;
    this.running = 0;
    this.queue = [];
  }

  async add(asyncFunction) {
    return new Promise((resolve, reject) => {
      this.queue.push({
        asyncFunction,
        resolve,
        reject,
      });
      this.tryNext();
    });
  }

  async tryNext() {
    if (this.running >= this.limit || this.queue.length === 0) {
      return;
    }

    this.running++;
    const { asyncFunction, resolve, reject } = this.queue.shift();

    try {
      const result = await asyncFunction();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.running--;
      this.tryNext();
    }
  }
}

/**
 * 批量运行工作流
 * @param {Object} config - 配置参数
 * @param {string} config.workspace - 工作空间名称
 * @param {string} config.model - 默认模型
 * @param {string} [config.questionListPath] - 问题列表文件路径
 * @param {number} [config.concurrency] - 并发数量限制
 * @param {boolean} [config.enableFSM] - 是否启用 FSM 生成
 * @param {boolean} [config.enableTests] - 是否启用测试生成
 * @param {Object} [config.models] - 各 Agent 的模型配置
 */
export async function runBatchWorkflow(config) {
  const {
    workspace,
    model,
    questionListPath = "./question-list-short.json",
    concurrency = 3,
    enableFSM = true,
    enableTests = true,
    models = {},
  } = config;

  console.log(`
╔════════════════════════════════════════════════════════════════════════╗
║  批量工作流执行器 - Batch Workflow Runner                              ║
╚════════════════════════════════════════════════════════════════════════╝

配置信息:
  • 工作空间: ${workspace}
  • 默认模型: ${model}
  • HTML Agent: ${models.html || model}
  • FSM Agent: ${models.fsm || model}
  • Playwright Agent: ${models.playwright || model}
  • 并发数: ${concurrency}
  • 启用 FSM: ${enableFSM ? "✅" : "❌"}
  • 启用测试: ${enableTests ? "✅" : "❌"}
  • 问题列表: ${questionListPath}
`);

  // 读取问题列表
  let questions;
  try {
    const questionsData = await fs.readFile(questionListPath, "utf-8");
    questions = JSON.parse(questionsData);

    if (!Array.isArray(questions)) {
      throw new Error("问题列表必须是数组格式");
    }

    console.log(`📋 已加载 ${questions.length} 个问题\n`);
  } catch (error) {
    console.error(`❌ 读取问题列表失败: ${error.message}`);
    process.exit(1);
  }

  // 初始化并发限制器
  const limiter = new ConcurrencyLimiter(concurrency);

  // 统计信息
  const stats = {
    total: questions.length,
    completed: 0,
    success: 0,
    failed: 0,
    startTime: Date.now(),
  };

  // 结果收集
  const results = [];

  // 创建工作流任务
  const tasks = questions.map((topic, index) => {
    return limiter.add(async () => {
      const taskId = `Task-${(index + 1).toString().padStart(3, "0")}`;
      const question = `${topic}`;

      console.log(`🚀 [${taskId}] 开始处理: ${topic}`);

      try {
        const result = await runWorkflow(
          {
            question,
            workspace,
            model,
            topic,
            models,
          },
          {
            showProgress: false, // 批量模式下关闭详细进度
            enableFSM,
            enableTests,
            taskId,
          }
        );

        if (result.success) {
          stats.success++;
          console.log(`✅ [${taskId}] ${topic} - 完成`);
          console.log(`   📄 HTML: ${result.resultId}.html`);
          if (result.fsmData) console.log(`   🔄 FSM: ${result.resultId}.json`);
          if (result.testCode)
            console.log(`   🧪 测试: ${result.testFileName}`);
        } else {
          stats.failed++;
          console.error(`❌ [${taskId}] ${topic} - 失败: ${result.error}`);
        }

        results.push({
          taskId,
          topic,
          question,
          ...result,
        });
      } catch (error) {
        stats.failed++;
        console.error(`💥 [${taskId}] ${topic} - 异常: ${error.message}`);
        results.push({
          taskId,
          topic,
          question,
          success: false,
          error: error.message,
        });
      } finally {
        stats.completed++;
        const progress = ((stats.completed / stats.total) * 100).toFixed(1);
        const elapsed = ((Date.now() - stats.startTime) / 1000).toFixed(1);
        console.log(
          `📊 进度: ${stats.completed}/${stats.total} (${progress}%) - 用时: ${elapsed}s\n`
        );
      }
    });
  });

  // 等待所有任务完成
  console.log(
    `⚡ 开始执行 ${questions.length} 个任务 (并发数: ${concurrency})\n`
  );

  try {
    await Promise.all(tasks);
  } catch (error) {
    console.error(`批量执行过程中发生错误: ${error.message}`);
  }

  // 生成执行报告
  await generateBatchReport(results, stats, workspace);

  // 输出最终统计
  const totalTime = ((Date.now() - stats.startTime) / 1000 / 60).toFixed(2);

  console.log(`
╔════════════════════════════════════════════════════════════════════════╗
║  批量执行完成 - Batch Execution Completed                             ║
╚════════════════════════════════════════════════════════════════════════╝

📊 执行统计:
  • 总任务数: ${stats.total}
  • 成功: ${stats.success} ✅
  • 失败: ${stats.failed} ❌
  • 成功率: ${((stats.success / stats.total) * 100).toFixed(1)}%
  • 总耗时: ${totalTime} 分钟
  • 平均耗时: ${((parseFloat(totalTime) * 60) / stats.total).toFixed(1)} 秒/任务

📁 输出位置: ./workspace/${workspace}/
📋 详细报告: ./workspace/${workspace}/batch-report.json

🌐 查看结果: http://127.0.0.1:5500/workspace/${workspace}/html/
`);

  return {
    stats,
    results,
    workspace,
  };
}

/**
 * 生成批量执行报告
 */
async function generateBatchReport(results, stats, workspace) {
  const reportDir = `./workspace/${workspace}`;
  const reportPath = `${reportDir}/batch-report.json`;

  const report = {
    timestamp: new Date().toISOString(),
    stats,
    results: results.map((r) => ({
      taskId: r.taskId,
      topic: r.topic,
      question: r.question,
      success: r.success,
      resultId: r.resultId,
      htmlUrl: r.htmlUrl,
      hasFSM: !!r.fsmData,
      hasTest: !!r.testCode,
      testFileName: r.testFileName,
      ...(r.error && { error: r.error }),
    })),
  };

  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

  console.log(`📋 批量报告已生成: ${reportPath}`);
}

// 命令行参数处理
function parseArgs() {
  const args = process.argv.slice(2);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const config = {
    workspace: "batch-" + timestamp,
    model: "gpt-4o",
    concurrency: 3,
    enableFSM: true,
    enableTests: true,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    switch (arg) {
      case "-w":
      case "--workspace":
        config.workspace = next;
        i++;
        break;
      case "-m":
      case "--model":
        config.model = next;
        i++;
        break;
      case "--html-model":
        if (!config.models) config.models = {};
        config.models.html = next;
        i++;
        break;
      case "--fsm-model":
        if (!config.models) config.models = {};
        config.models.fsm = next;
        i++;
        break;
      case "--playwright-model":
        if (!config.models) config.models = {};
        config.models.playwright = next;
        i++;
        break;
      case "-c":
      case "--concurrency":
        config.concurrency = parseInt(next) || 10;
        i++;
        break;
      case "--no-fsm":
        config.enableFSM = false;
        break;
      case "--no-tests":
        config.enableTests = false;
        break;
      case "-q":
      case "--questions":
        config.questionListPath = next;
        i++;
        break;
      case "-h":
      case "--help":
        console.log(`
用法: node batch-workflow.mjs [选项]

选项:
  -w, --workspace <名称>     工作空间名称 (默认: batch-YYYY-MM-DDTHH-MM-SS-mmm)
  -m, --model <模型>         默认 AI 模型名称 (默认: gpt-4o)
  --html-model <模型>        HTML Agent 专用模型
  --fsm-model <模型>         FSM Agent 专用模型
  --playwright-model <模型>  Playwright Agent 专用模型
  -c, --concurrency <数量>   并发任务数 (默认: 10)
  -q, --questions <路径>     问题列表文件路径 (默认: ./question-list.json)
  --no-fsm                   禁用 FSM 生成
  --no-tests                 禁用测试生成
  -h, --help                 显示帮助信息

示例:
  node batch-workflow.mjs -w "algorithm-demos" -c 5
  node batch-workflow.mjs --model "gpt-4o" --fsm-model "gpt-3.5-turbo"
  node batch-workflow.mjs --html-model "gpt-4o" --playwright-model "claude-3-sonnet" --no-tests
        `);
        process.exit(0);
    }
  }

  return config;
}

// 如果直接运行此文件
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const config = parseArgs();

  runBatchWorkflow(config)
    .then((result) => {
      console.log("🎉 批量工作流执行完成！");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 批量工作流执行失败:", error);
      process.exit(1);
    });
}

export default runBatchWorkflow;
