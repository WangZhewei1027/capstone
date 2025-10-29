import { test, expect } from "@playwright/test";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

// 获取当前脚本所在目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 定义路径
const HTML_FOLDER = path.join(__dirname, "html");
const VISUALS_FOLDER = path.join(__dirname, "visuals");

/**
 * 获取所有HTML文件
 */
async function getHtmlFiles() {
  try {
    const files = await fs.readdir(HTML_FOLDER);
    return files.filter((file) => file.endsWith(".html"));
  } catch (error) {
    console.error("读取HTML文件夹失败:", error);
    return [];
  }
}

/**
 * 确保目录存在
 */
async function ensureDirectory(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    console.error("创建目录失败:", error);
  }
}

/**
 * 获取HTML文件的绝对路径
 */
function getHtmlFilePath(htmlFileName) {
  const htmlFilePath = path.join(HTML_FOLDER, htmlFileName);
  // 转换为file:// URL格式，确保Windows路径正确处理
  if (process.platform === "win32") {
    return `file:///${htmlFilePath.replace(/\\/g, "/")}`;
  }
  return `file://${htmlFilePath}`;
}

// 动态生成测试
const htmlFiles = await getHtmlFiles();
console.log(`发现 ${htmlFiles.length} 个HTML文件`);

// 确保visuals文件夹存在
await ensureDirectory(VISUALS_FOLDER);

test.describe("批量捕获初始状态截图", () => {
  // 批量处理所有文件的测试
  test("捕获所有HTML文件的初始状态截图", async ({ page }) => {
    console.log(`开始处理 ${htmlFiles.length} 个HTML文件...`);

    for (let i = 0; i < htmlFiles.length; i++) {
      const htmlFile = htmlFiles[i];
      const htmlFileName = path.basename(htmlFile, ".html");

      try {
        console.log(`[${i + 1}/${htmlFiles.length}] 正在处理: ${htmlFile}`);

        // 创建对应的截图文件夹
        const screenshotFolder = path.join(VISUALS_FOLDER, htmlFileName);
        await ensureDirectory(screenshotFolder);

        // 导航到HTML文件
        const htmlUrl = getHtmlFilePath(htmlFile);
        console.log(`  导航到: ${htmlUrl}`);

        await page.goto(htmlUrl, {
          waitUntil: "networkidle",
          timeout: 30000,
        });

        // 额外等待确保所有动态内容加载完成
        await page.waitForTimeout(3000);

        // 截图路径
        const screenshotPath = path.join(screenshotFolder, "initial_state.png");

        // 捕获初始状态截图
        await page.screenshot({
          path: screenshotPath,
          fullPage: true,
          type: "png",
          animations: "disabled", // 禁用动画以获得一致的截图
        });

        console.log(`  ✅ 已保存截图: ${screenshotPath}`);
      } catch (error) {
        console.error(`  ❌ 处理文件 ${htmlFile} 时出错:`, error.message);
        // 继续处理下一个文件，不中断整个流程
        continue;
      }
    }

    console.log(`🎉 完成！共处理了 ${htmlFiles.length} 个HTML文件`);
  });
});

// 为每个HTML文件创建单独的测试（可选，用于并行处理）
htmlFiles.forEach((htmlFile, index) => {
  test(`[${index + 1}] 捕获 ${htmlFile} 的初始状态`, async ({ page }) => {
    const htmlFileName = path.basename(htmlFile, ".html");

    // 创建截图文件夹
    const screenshotFolder = path.join(VISUALS_FOLDER, htmlFileName);
    await ensureDirectory(screenshotFolder);

    // 导航到HTML文件
    const htmlUrl = getHtmlFilePath(htmlFile);

    await page.goto(htmlUrl, {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    // 等待页面稳定
    await page.waitForTimeout(3000);

    // 截图
    const screenshotPath = path.join(screenshotFolder, "initial_state.png");
    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
      type: "png",
      animations: "disabled",
    });

    console.log(`✅ [${htmlFile}] 截图已保存: ${screenshotPath}`);
  });
});
