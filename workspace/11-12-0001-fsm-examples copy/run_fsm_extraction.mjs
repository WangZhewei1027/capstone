#!/usr/bin/env node

import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置选项
const config = {
  // 要测试的HTML文件名（放在html/目录下）
  htmlFile: process.argv[2] || "65f37f00-b408-11f0-ab52-fbe7249bf639.html",

  // 测试类型
  testType: process.argv[3] || "full", // full, extract, compare

  // 输出目录
  outputDir: {
    visuals: "./visuals",
    fsm: "./fsm",
  },
};

console.log(`🚀 FSM智能提取工具`);
console.log(`📁 目标HTML: ${config.htmlFile}`);
console.log(`🔧 测试类型: ${config.testType}`);
console.log(
  `📂 输出目录: visuals=${config.outputDir.visuals}, fsm=${config.outputDir.fsm}`
);

try {
  // 设置环境变量
  process.env.TARGET_HTML_FILE = config.htmlFile;

  let command;

  switch (config.testType) {
    case "extract":
      command = `npx playwright test fsm-interactive-capture.spec.js -g "自动FSM提取和重建"`;
      break;
    case "compare":
      command = `npx playwright test fsm-interactive-capture.spec.js -g "FSM对比分析"`;
      break;
    case "full":
    default:
      command = `npx playwright test fsm-interactive-capture.spec.js`;
      break;
  }

  console.log(`\n⚡ 执行命令: ${command}`);
  console.log(`⏱️  开始时间: ${new Date().toISOString()}`);

  // 执行测试
  execSync(command, {
    stdio: "inherit",
    cwd: __dirname,
  });

  console.log(`\n✅ 测试完成!`);
  console.log(`⏱️  结束时间: ${new Date().toISOString()}`);

  // 输出结果位置
  const htmlFileName = path.basename(config.htmlFile, ".html");
  console.log(`\n📊 查看结果:`);
  console.log(`   📸 截图: ${config.outputDir.visuals}/${htmlFileName}/`);
  console.log(`   📋 FSM数据: ${config.outputDir.fsm}/${htmlFileName}/`);
} catch (error) {
  console.error(`\n❌ 测试失败:`, error.message);
  process.exit(1);
}

// 使用说明
function showUsage() {
  console.log(`
使用方法:
  node run_fsm_extraction.mjs [HTML文件名] [测试类型]

参数:
  HTML文件名    要分析的HTML文件（默认: 65f37f00-b408-11f0-ab52-fbe7249bf639.html）
  测试类型      full|extract|compare（默认: full）

示例:
  node run_fsm_extraction.mjs my-bst-page.html full
  node run_fsm_extraction.mjs my-bst-page.html extract  
  node run_fsm_extraction.mjs my-bst-page.html compare

测试类型说明:
  full     - 完整测试（提取+对比）
  extract  - 只进行FSM提取
  compare  - 只进行FSM对比分析（需要先运行extract）
`);
}

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  showUsage();
  process.exit(0);
}
