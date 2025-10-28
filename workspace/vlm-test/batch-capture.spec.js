import { test } from "@playwright/test";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HTML_FOLDER = path.join(__dirname, "html");
const VISUALS_FOLDER = path.join(__dirname, "visuals");

// 确保目录存在
async function ensureDirectory(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

// 获取HTML文件路径
function getHtmlFilePath(htmlFileName) {
  const htmlFilePath = path.join(HTML_FOLDER, htmlFileName);
  return `file:///${htmlFilePath.replace(/\\/g, "/")}`;
}

// 获取所有HTML文件
const htmlFiles = await fs
  .readdir(HTML_FOLDER)
  .then((files) => files.filter((file) => file.endsWith(".html")));

console.log(`发现 ${htmlFiles.length} 个HTML文件`);
await ensureDirectory(VISUALS_FOLDER);

test.describe("VLM测试 - 初始状态截图", () => {
  test("批量捕获所有HTML文件的初始状态", async ({ page }) => {
    let successCount = 0;
    let errorCount = 0;

    // 设置页面超时
    page.setDefaultTimeout(15000);
    page.setDefaultNavigationTimeout(15000);

    for (let i = 0; i < htmlFiles.length; i++) {
      const htmlFile = htmlFiles[i];
      const htmlFileName = path.basename(htmlFile, ".html");

      try {
        console.log(`\n[${i + 1}/${htmlFiles.length}] 处理: ${htmlFile}`);

        // 创建截图文件夹
        const screenshotFolder = path.join(VISUALS_FOLDER, htmlFileName);
        await ensureDirectory(screenshotFolder);

        // 导航到HTML文件
        const htmlUrl = getHtmlFilePath(htmlFile);
        console.log(`  导航到: ${htmlUrl}`);

        // 使用更短的超时和更简单的等待策略
        await page.goto(htmlUrl, {
          waitUntil: "domcontentloaded", // 改为更快的加载策略
          timeout: 10000, // 减少超时时间
        });

        // 等待页面稳定，但时间更短
        await page.waitForTimeout(1000);

        // 截图
        const screenshotPath = path.join(screenshotFolder, "initial_state.png");
        await page.screenshot({
          path: screenshotPath,
          fullPage: true,
          type: "png",
          timeout: 5000, // 截图超时
        });

        console.log(`  ✅ 成功保存: ${screenshotPath}`);
        successCount++;
      } catch (error) {
        console.error(`  ❌ 错误: ${error.message}`);
        errorCount++;

        // 尝试继续处理下一个文件，先清理当前页面状态
        try {
          await page.goto("about:blank", { timeout: 5000 });
        } catch (cleanupError) {
          console.error(`  清理页面状态失败: ${cleanupError.message}`);
        }
      }
    }

    console.log(`\n🎉 完成处理！`);
    console.log(`✅ 成功: ${successCount} 个文件`);
    console.log(`❌ 失败: ${errorCount} 个文件`);
  });
});
