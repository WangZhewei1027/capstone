#!/usr/bin/env node

/**
 * VLM测试截图捕获运行脚本
 * 使用方法: node run-capture.mjs
 */

import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("🚀 开始VLM测试截图捕获...");
console.log("📁 工作目录:", __dirname);

// 运行Playwright测试
const playwrightProcess = spawn(
  "npx",
  [
    "playwright",
    "test",
    "batch-capture.spec.js",
    "--headed", // 显示浏览器窗口，可以看到处理过程
  ],
  {
    cwd: __dirname,
    stdio: "inherit",
    shell: true,
  }
);

playwrightProcess.on("close", (code) => {
  if (code === 0) {
    console.log("\n🎉 截图捕获完成！");
    console.log("📸 截图保存在: ./visuals/ 文件夹中");
    console.log("📝 每个HTML文件都有对应的文件夹，包含 initial_state.png");
  } else {
    console.error(`\n❌ 进程退出，代码: ${code}`);
  }
});

playwrightProcess.on("error", (error) => {
  console.error("❌ 启动进程时出错:", error);
});
