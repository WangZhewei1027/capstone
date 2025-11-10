#!/usr/bin/env node

/**
 * 单文件截图测试运行脚本
 * 使用方法: node test-single.mjs [文件名]
 */

import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 获取命令行参数
const targetFile = process.argv[2];

if (!targetFile) {
  console.log("📋 可用的HTML文件:");
  try {
    const htmlFiles = await fs.readdir(path.join(__dirname, "html"));
    const htmlFilesFiltered = htmlFiles.filter((file) =>
      file.endsWith(".html")
    );
    htmlFilesFiltered.slice(0, 10).forEach((file, index) => {
      console.log(`  ${index + 1}. ${file}`);
    });
    if (htmlFilesFiltered.length > 10) {
      console.log(`  ... 还有 ${htmlFilesFiltered.length - 10} 个文件`);
    }
    console.log("\n使用方法:");
    console.log(`node test-single.mjs ${htmlFilesFiltered[0]}`);
  } catch (error) {
    console.error("读取HTML文件列表失败:", error.message);
  }
  process.exit(1);
}

console.log(`🎯 测试文件: ${targetFile}`);

// 设置环境变量并运行测试
const env = { ...process.env, TARGET_FILE: targetFile };

const playwrightProcess = spawn(
  "npx",
  ["playwright", "test", "quick-test.spec.js", "--headed"],
  {
    cwd: __dirname,
    stdio: "inherit",
    shell: true,
    env: env,
  }
);

playwrightProcess.on("close", (code) => {
  if (code === 0) {
    console.log(`\n✅ 测试完成！文件: ${targetFile}`);
  } else {
    console.error(`\n❌ 测试失败，退出代码: ${code}`);
  }
});

playwrightProcess.on("error", (error) => {
  console.error("❌ 启动测试时出错:", error);
});
