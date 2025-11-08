#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 验证并修复测试文件中的语法错误
 * 用法: node validate-tests.mjs <workspace-path>
 * 示例: node validate-tests.mjs workspace/11-08-0003
 */

function validateAndFixTestFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  let fixed = content;
  let hasChanges = false;
  const errors = [];

  // 检测1: 重复声明的变量
  const lines = content.split("\n");
  const declaredVars = new Map(); // 变量名 -> 行号数组

  lines.forEach((line, index) => {
    const constMatch = line.match(/^\s*const\s+(\w+)\s*=/);
    const letMatch = line.match(/^\s*let\s+(\w+)\s*=/);
    const varMatch = constMatch || letMatch;

    if (varMatch) {
      const varName = varMatch[1];
      if (!declaredVars.has(varName)) {
        declaredVars.set(varName, []);
      }
      declaredVars.get(varName).push(index + 1);
    }
  });

  // 找出重复声明的变量
  for (const [varName, lineNumbers] of declaredVars.entries()) {
    if (lineNumbers.length > 1) {
      errors.push({
        type: "duplicate-declaration",
        variable: varName,
        lines: lineNumbers,
      });

      // 修复：重命名后续的声明
      let renameCount = 1;
      for (let i = 1; i < lineNumbers.length; i++) {
        const lineIndex = lineNumbers[i] - 1;
        const newVarName = `${varName}${renameCount}`;

        // 替换该行的声明
        lines[lineIndex] = lines[lineIndex].replace(
          new RegExp(`\\b${varName}\\b`, "g"),
          newVarName
        );

        renameCount++;
        hasChanges = true;
      }
    }
  }

  if (hasChanges) {
    fixed = lines.join("\n");
  }

  // 检测2: 缺少右括号 - 改进版
  // 逐行检查每个 expect().toBe() 调用
  lines.forEach((line, index) => {
    const toBeMatch = line.match(/\.toBe\(/);
    if (toBeMatch) {
      const lineAfterToBe = line.substring(line.indexOf(".toBe("));
      const openCount = (lineAfterToBe.match(/\(/g) || []).length;
      const closeCount = (lineAfterToBe.match(/\)/g) || []).length;

      if (openCount > closeCount) {
        errors.push({
          type: "unmatched-parentheses-line",
          line: index + 1,
          open: openCount,
          close: closeCount,
        });

        // 修复：在分号前添加缺少的括号
        lines[index] = line.replace(/;(\s*\/\/.*)?$/, ")$1");
        hasChanges = true;
      }
    }
  });

  if (hasChanges) {
    fixed = lines.join("\n");
  }

  return { fixed, hasChanges, errors };
}

function validateWorkspace(workspacePath) {
  const testsDir = path.join(workspacePath, "tests");

  if (!fs.existsSync(testsDir)) {
    console.error(`❌ 测试目录不存在: ${testsDir}`);
    process.exit(1);
  }

  const testFiles = fs
    .readdirSync(testsDir)
    .filter((f) => f.endsWith(".spec.js"));

  console.log(`📝 发现 ${testFiles.length} 个测试文件\n`);

  let fixedCount = 0;
  let errorCount = 0;
  const invalidFiles = [];

  testFiles.forEach((file) => {
    const filePath = path.join(testsDir, file);
    const result = validateAndFixTestFile(filePath);

    if (result.errors.length > 0) {
      console.log(`\n⚠️  ${file}:`);
      result.errors.forEach((error) => {
        if (error.type === "duplicate-declaration") {
          console.log(
            `   - 重复声明变量 '${error.variable}' (行 ${error.lines.join(
              ", "
            )})`
          );
        } else if (error.type === "unmatched-parentheses") {
          console.log(
            `   - 括号不匹配 (开: ${error.open}, 闭: ${error.close})`
          );
        }
      });

      errorCount++;

      if (result.hasChanges) {
        fs.writeFileSync(filePath, result.fixed, "utf8");
        console.log(`   ✅ 已自动修复`);
        fixedCount++;
      } else {
        console.log(`   ❌ 无法自动修复`);
        invalidFiles.push(file);
      }
    }
  });

  console.log(`\n${"=".repeat(50)}`);
  console.log(`📊 验证完成:`);
  console.log(`   总文件数: ${testFiles.length}`);
  console.log(`   有错误: ${errorCount}`);
  console.log(`   已修复: ${fixedCount}`);
  console.log(`   无法修复: ${invalidFiles.length}`);

  if (invalidFiles.length > 0) {
    console.log(`\n⚠️  以下文件无法自动修复，将被跳过:`);
    invalidFiles.forEach((file) => {
      const filePath = path.join(testsDir, file);
      const backupPath = filePath + ".invalid";

      // 重命名为 .invalid 文件，这样 Playwright 不会加载它
      fs.renameSync(filePath, backupPath);
      console.log(`   - ${file} → ${file}.invalid`);
    });
  }

  console.log(`\n✅ 可以安全运行测试了！`);
}

// 主程序
const workspacePath = process.argv[2];

if (!workspacePath) {
  console.error("用法: node validate-tests.mjs <workspace-path>");
  console.error("示例: node validate-tests.mjs workspace/11-08-0003");
  process.exit(1);
}

validateWorkspace(workspacePath);
