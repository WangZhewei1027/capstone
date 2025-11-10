import { test } from "@playwright/test";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HTML_FOLDER = path.join(__dirname, "html");
const VISUALS_FOLDER = path.join(__dirname, "visuals");

// 获取命令行参数中的文件名（如果提供）
const targetFile = process.env.TARGET_FILE;

// 确保目录存在
async function ensureDirectory(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

// 获取HTML文件路径
function getHtmlFilePath(htmlFileName) {
  const htmlFilePath = path.join(HTML_FOLDER, htmlFileName);
  return `file:///${htmlFilePath.replace(/\\/g, "/")}`;
}

// 获取要处理的HTML文件
let htmlFiles;
if (targetFile) {
  htmlFiles = [targetFile];
  console.log(`测试单个文件: ${targetFile}`);
} else {
  htmlFiles = await fs
    .readdir(HTML_FOLDER)
    .then((files) =>
      files.filter((file) => file.endsWith(".html")).slice(0, 3)
    ); // 只处理前3个
  console.log(`测试前3个文件: ${htmlFiles.join(", ")}`);
}

await ensureDirectory(VISUALS_FOLDER);

test.describe("VLM测试 - 快速测试", () => {
  htmlFiles.forEach((htmlFile, index) => {
    test(`[${index + 1}] 捕获 ${htmlFile} 的截图`, async ({ page }) => {
      const htmlFileName = path.basename(htmlFile, ".html");

      try {
        console.log(`\n处理: ${htmlFile}`);

        // 创建截图文件夹
        const screenshotFolder = path.join(VISUALS_FOLDER, htmlFileName);
        await ensureDirectory(screenshotFolder);

        // 检查是否已存在
        const screenshotPath = path.join(screenshotFolder, "initial_state.png");
        try {
          await fs.access(screenshotPath);
          console.log(`  ⏭️ 跳过（已存在）`);
          return;
        } catch {
          // 继续处理
        }

        // 设置短超时
        page.setDefaultTimeout(8000);
        page.setDefaultNavigationTimeout(8000);

        // 导航到HTML文件
        const htmlUrl = getHtmlFilePath(htmlFile);
        console.log(`  导航到: ${htmlUrl}`);

        await page.goto(htmlUrl, {
          waitUntil: "domcontentloaded",
          timeout: 6000,
        });

        // 很短的等待
        await page.waitForTimeout(300);

        // 截图
        await page.screenshot({
          path: screenshotPath,
          fullPage: true,
          type: "png",
          timeout: 3000,
        });

        console.log(`  ✅ 成功: ${screenshotPath}`);
      } catch (error) {
        console.error(`  ❌ 失败: ${error.message}`);
        throw error; // 让测试失败，便于调试
      }
    });
  });
});
