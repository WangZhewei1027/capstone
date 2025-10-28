import { test } from "@playwright/test";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HTML_FOLDER = path.join(__dirname, "html");
const VISUALS_FOLDER = path.join(__dirname, "visuals");

// 在这里直接指定要测试的文件
const TARGET_FILE = "45a42250-b3c1-11f0-9577-1b326fe6059a.html"; // 修改这里来测试不同的文件

// 确保目录存在
async function ensureDirectory(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

// 获取HTML文件路径
function getHtmlFilePath(htmlFileName) {
  const htmlFilePath = path.join(HTML_FOLDER, htmlFileName);
  return `file:///${htmlFilePath.replace(/\\/g, "/")}`;
}

await ensureDirectory(VISUALS_FOLDER);

test.describe("VLM测试 - 单文件测试", () => {
  test(`捕获 ${TARGET_FILE} 的截图`, async ({ page }) => {
    const htmlFileName = path.basename(TARGET_FILE, ".html");

    try {
      console.log(`\n处理文件: ${TARGET_FILE}`);

      // 创建截图文件夹
      const screenshotFolder = path.join(VISUALS_FOLDER, htmlFileName);
      await ensureDirectory(screenshotFolder);

      // 检查是否已存在
      const screenshotPath = path.join(screenshotFolder, "initial_state.png");
      try {
        await fs.access(screenshotPath);
        console.log(`  ⏭️ 截图已存在，将覆盖: ${screenshotPath}`);
      } catch {
        console.log(`  📸 创建新截图: ${screenshotPath}`);
      }

      // 设置超时
      page.setDefaultTimeout(10000);
      page.setDefaultNavigationTimeout(10000);

      // 导航到HTML文件
      const htmlUrl = getHtmlFilePath(TARGET_FILE);
      console.log(`  🌐 导航到: ${htmlUrl}`);

      await page.goto(htmlUrl, {
        waitUntil: "domcontentloaded",
        timeout: 8000,
      });

      console.log(`  ⏳ 等待页面稳定...`);
      await page.waitForTimeout(1000);

      // 截图
      console.log(`  📸 正在截图...`);
      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
        type: "png",
        timeout: 5000,
      });

      console.log(`  ✅ 成功保存截图: ${screenshotPath}`);
    } catch (error) {
      console.error(`  ❌ 处理失败: ${error.message}`);
      console.error(`  详细错误: ${error.stack}`);
      throw error;
    }
  });
});
