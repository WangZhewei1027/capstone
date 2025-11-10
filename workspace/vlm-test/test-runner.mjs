#!/usr/bin/env node

import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HTML_FOLDER = path.join(__dirname, "html");

// 获取HTML文件列表
async function getHtmlFiles() {
  try {
    const files = await fs.readdir(HTML_FOLDER);
    return files.filter((file) => file.endsWith(".html")).sort();
  } catch (error) {
    console.error("无法读取HTML文件:", error);
    return [];
  }
}

// 运行Playwright测试
function runPlaywrightTest(testFile, options = {}) {
  return new Promise((resolve, reject) => {
    const args = ["playwright", "test", testFile];

    if (options.headed) {
      args.push("--headed");
    }

    if (options.targetFile) {
      // 设置环境变量指定目标文件
      process.env.TARGET_HTML_FILE = options.targetFile;
    }

    console.log(`🚀 运行测试: npx ${args.join(" ")}`);
    if (options.targetFile) {
      console.log(`🎯 目标文件: ${options.targetFile}`);
    }

    const child = spawn("npx", args, {
      stdio: "inherit",
      env: { ...process.env },
    });

    child.on("close", (code) => {
      if (code === 0) {
        console.log(`✅ 测试完成`);
        resolve();
      } else {
        console.log(`❌ 测试失败，退出码: ${code}`);
        reject(new Error(`Test failed with code ${code}`));
      }
    });

    child.on("error", (error) => {
      console.error(`❌ 测试执行错误:`, error);
      reject(error);
    });
  });
}

// 显示菜单
function showMenu() {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    🧪 通用FSM测试工具                        ║
╠══════════════════════════════════════════════════════════════╣
║  1. 运行原始BST专用测试 (fsm-interactive-capture.spec.js)   ║
║  2. 运行快速通用测试 (quick-universal-test.spec.js)         ║
║  3. 运行完整通用测试 (universal-fsm-capture.spec.js)        ║
║  4. 运行智能策略测试 (intelligent-fsm-test.spec.js)         ║
║  5. 测试指定HTML文件                                         ║
║  6. 批量测试所有HTML文件                                     ║
║  7. 查看可用HTML文件                                         ║
║  8. 退出                                                     ║
╚══════════════════════════════════════════════════════════════╝
`);
}

// 显示HTML文件列表
async function showHtmlFiles() {
  const htmlFiles = await getHtmlFiles();
  console.log(`\n📁 可用的HTML文件 (${htmlFiles.length} 个):`);
  console.log("═".repeat(60));

  htmlFiles.forEach((file, index) => {
    console.log(`${(index + 1).toString().padStart(2, " ")}. ${file}`);
  });
  console.log();
}

// 主菜单循环
async function mainMenu() {
  const readline = await import("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt) =>
    new Promise((resolve) => rl.question(prompt, resolve));

  while (true) {
    showMenu();
    const choice = await question("请选择操作 (1-8): ");

    try {
      switch (choice.trim()) {
        case "1":
          console.log(`\n🧪 运行原始BST专用测试...`);
          await runPlaywrightTest("fsm-interactive-capture.spec.js", {
            headed: true,
          });
          break;

        case "2":
          console.log(`\n🧪 运行快速通用测试...`);
          await runPlaywrightTest("quick-universal-test.spec.js", {
            headed: true,
          });
          break;

        case "3":
          console.log(`\n🧪 运行完整通用测试...`);
          await runPlaywrightTest("universal-fsm-capture.spec.js");
          break;

        case "4":
          console.log(`\n🧪 运行智能策略测试...`);
          await runPlaywrightTest("intelligent-fsm-test.spec.js");
          break;

        case "5":
          await showHtmlFiles();
          const htmlFiles = await getHtmlFiles();
          const fileChoice = await question("请选择文件编号: ");
          const fileIndex = parseInt(fileChoice) - 1;

          if (fileIndex >= 0 && fileIndex < htmlFiles.length) {
            const selectedFile = htmlFiles[fileIndex];
            console.log(`\n🎯 测试文件: ${selectedFile}`);

            const testChoice = await question(`
选择测试类型:
  1. 快速测试
  2. 完整通用测试  
  3. 智能策略测试
请选择 (1-3): `);

            let testFile;
            switch (testChoice.trim()) {
              case "1":
                testFile = "quick-universal-test.spec.js";
                break;
              case "2":
                testFile = "universal-fsm-capture.spec.js";
                break;
              case "3":
                testFile = "intelligent-fsm-test.spec.js";
                break;
              default:
                testFile = "quick-universal-test.spec.js";
            }

            await runPlaywrightTest(testFile, {
              targetFile: selectedFile,
              headed: testChoice.trim() === "1",
            });
          } else {
            console.log("❌ 无效的文件编号");
          }
          break;

        case "6":
          console.log(`\n🧪 批量测试所有HTML文件...`);
          const batchChoice = await question(`
选择批量测试类型:
  1. 快速测试所有文件
  2. 智能策略测试所有文件
请选择 (1-2): `);

          if (batchChoice.trim() === "1") {
            await runPlaywrightTest("quick-universal-test.spec.js");
          } else {
            await runPlaywrightTest("intelligent-fsm-test.spec.js");
          }
          break;

        case "7":
          await showHtmlFiles();
          await question("按回车键继续...");
          break;

        case "8":
          console.log("👋 再见!");
          rl.close();
          return;

        default:
          console.log("❌ 无效选择，请重试");
          await question("按回车键继续...");
      }
    } catch (error) {
      console.error("❌ 操作失败:", error.message);
      await question("按回车键继续...");
    }

    console.log("\n" + "═".repeat(60) + "\n");
  }
}

// 如果直接运行此脚本
if (process.argv[1] === __filename) {
  console.log("🎯 通用FSM测试工具启动中...\n");
  mainMenu().catch(console.error);
}

export { runPlaywrightTest, getHtmlFiles };
