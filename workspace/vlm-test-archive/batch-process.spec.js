import { test } from "@playwright/test";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HTML_FOLDER = path.join(__dirname, "html");
const VISUALS_FOLDER = path.join(__dirname, "visuals");
const BATCH_SIZE = 5; // 每批处理5个文件

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

// 将文件分批
const batches = [];
for (let i = 0; i < htmlFiles.length; i += BATCH_SIZE) {
  batches.push(htmlFiles.slice(i, i + BATCH_SIZE));
}

test.describe("VLM测试 - 分批处理截图", () => {
  batches.forEach((batch, batchIndex) => {
    test(`批次 ${batchIndex + 1}/${batches.length} - 处理 ${
      batch.length
    } 个文件`, async ({ page }) => {
      let successCount = 0;
      let errorCount = 0;

      // 设置较短的超时
      page.setDefaultTimeout(10000);
      page.setDefaultNavigationTimeout(10000);

      for (let i = 0; i < batch.length; i++) {
        const htmlFile = batch[i];
        const htmlFileName = path.basename(htmlFile, ".html");
        const globalIndex = batchIndex * BATCH_SIZE + i + 1;

        try {
          console.log(
            `\n[${globalIndex}/${htmlFiles.length}] 处理: ${htmlFile}`
          );

          // 创建截图文件夹
          const screenshotFolder = path.join(VISUALS_FOLDER, htmlFileName);
          await ensureDirectory(screenshotFolder);

          // 检查是否已经存在截图
          const screenshotPath = path.join(
            screenshotFolder,
            "initial_state.png"
          );
          try {
            await fs.access(screenshotPath);
            console.log(`  ⏭️ 跳过（已存在）: ${screenshotPath}`);
            successCount++;
            continue;
          } catch {
            // 文件不存在，继续处理
          }

          // 导航到HTML文件
          const htmlUrl = getHtmlFilePath(htmlFile);

          await page.goto(htmlUrl, {
            waitUntil: "domcontentloaded",
            timeout: 8000,
          });

          // 短暂等待
          await page.waitForTimeout(500);

          // 截图
          await page.screenshot({
            path: screenshotPath,
            fullPage: true,
            type: "png",
            timeout: 5000,
          });

          console.log(`  ✅ 成功保存: ${screenshotPath}`);
          successCount++;
        } catch (error) {
          console.error(`  ❌ 错误: ${error.message}`);
          errorCount++;

          // 清理页面状态
          try {
            await page.goto("about:blank", { timeout: 3000 });
          } catch (cleanupError) {
            // 忽略清理错误
          }
        }
      }

      console.log(`\n📊 批次 ${batchIndex + 1} 完成:`);
      console.log(`✅ 成功: ${successCount} 个文件`);
      console.log(`❌ 失败: ${errorCount} 个文件`);
    });
  });
});
