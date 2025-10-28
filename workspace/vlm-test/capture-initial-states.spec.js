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
  // 转换为file:// URL格式
  return `file:///${htmlFilePath.replace(/\\/g, "/")}`;
}

// 动态生成测试用例
test.describe("初始状态截图捕获", () => {
  let htmlFiles = [];

  test.beforeAll(async () => {
    // 获取所有HTML文件
    htmlFiles = await getHtmlFiles();
    console.log(`发现 ${htmlFiles.length} 个HTML文件`);

    // 确保visuals文件夹存在
    await ensureDirectory(VISUALS_FOLDER);
  });

  // 为每个HTML文件创建独立的测试
  test("捕获所有HTML文件的初始状态", async ({ page }) => {
    // 获取HTML文件列表
    const files = await getHtmlFiles();

    for (const htmlFile of files) {
      const htmlFileName = path.basename(htmlFile, ".html");

      try {
        console.log(`正在处理: ${htmlFile}`);

        // 创建对应的截图文件夹
        const screenshotFolder = path.join(VISUALS_FOLDER, htmlFileName);
        await ensureDirectory(screenshotFolder);

        // 导航到HTML文件
        const htmlUrl = getHtmlFilePath(htmlFile);
        await page.goto(htmlUrl);

        // 等待页面完全加载
        await page.waitForLoadState("networkidle");

        // 额外等待确保所有动态内容加载完成
        await page.waitForTimeout(2000);

        // 截图路径
        const screenshotPath = path.join(screenshotFolder, "initial_state.png");

        // 捕获初始状态截图
        await page.screenshot({
          path: screenshotPath,
          fullPage: true,
          type: "png",
        });

        console.log(`✅ 已保存截图: ${screenshotPath}`);
      } catch (error) {
        console.error(`❌ 处理文件 ${htmlFile} 时出错:`, error);
      }
    }
  });

  // 可选：为每个HTML文件创建单独的测试用例（如果需要并行处理）
  test.describe("单独测试每个HTML文件", () => {
    // 这个部分可以用于并行处理，但需要先获取文件列表
    const testFiles = [
      "45a42250-b3c1-11f0-9577-1b326fe6059a.html",
      "45b22c10-b3c1-11f0-9577-1b326fe6059a.html",
      // 可以添加更多文件，或者动态生成
    ];

    testFiles.forEach((htmlFile) => {
      test(`捕获 ${htmlFile} 的初始状态`, async ({ page }) => {
        const htmlFileName = path.basename(htmlFile, ".html");

        // 创建截图文件夹
        const screenshotFolder = path.join(VISUALS_FOLDER, htmlFileName);
        await ensureDirectory(screenshotFolder);

        // 导航到HTML文件
        const htmlUrl = getHtmlFilePath(htmlFile);
        await page.goto(htmlUrl);

        // 等待页面加载
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(2000);

        // 截图
        const screenshotPath = path.join(screenshotFolder, "initial_state.png");
        await page.screenshot({
          path: screenshotPath,
          fullPage: true,
          type: "png",
        });

        console.log(`✅ 已保存截图: ${screenshotPath}`);
      });
    });
  });
});
