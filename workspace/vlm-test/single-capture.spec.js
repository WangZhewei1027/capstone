import { test } from "@playwright/test";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HTML_FOLDER = path.join(__dirname, "html");
const VISUALS_FOLDER = path.join(__dirname, "visuals");

// 从环境变量或默认值获取目标文件
const TARGET_HTML_FILE =
  process.env.TARGET_HTML_FILE || "4ca11ad0-b408-11f0-ab52-fbe7249bf639.html";

// 确保目录存在
async function ensureDirectory(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

// 获取HTML文件路径
function getHtmlFilePath(htmlFileName) {
  const htmlFilePath = path.join(HTML_FOLDER, htmlFileName);
  return `file:///${htmlFilePath.replace(/\\/g, "/")}`;
}

// 验证目标文件是否存在
async function validateTargetFile(fileName) {
  const filePath = path.join(HTML_FOLDER, fileName);
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

await ensureDirectory(VISUALS_FOLDER);

test.describe("VLM测试 - 单文件截图捕获", () => {
  test(`捕获指定HTML文件: ${TARGET_HTML_FILE}`, async ({ page }) => {
    // 验证文件存在
    const fileExists = await validateTargetFile(TARGET_HTML_FILE);
    if (!fileExists) {
      throw new Error(`目标文件不存在: ${TARGET_HTML_FILE}`);
    }

    const htmlFileName = path.basename(TARGET_HTML_FILE, ".html");

    try {
      console.log(`\n📸 开始处理文件: ${TARGET_HTML_FILE}`);

      // 设置页面超时
      page.setDefaultTimeout(15000);
      page.setDefaultNavigationTimeout(15000);

      // 创建截图文件夹
      const screenshotFolder = path.join(VISUALS_FOLDER, htmlFileName);
      await ensureDirectory(screenshotFolder);

      // 检查是否已存在截图
      const screenshotPath = path.join(screenshotFolder, "initial_state.png");
      try {
        await fs.access(screenshotPath);
        console.log(`  ⚠️ 截图已存在，将覆盖: ${screenshotPath}`);
      } catch {
        console.log(`  📁 创建新截图: ${screenshotPath}`);
      }

      // 导航到HTML文件
      const htmlUrl = getHtmlFilePath(TARGET_HTML_FILE);
      console.log(`  🌐 导航到: ${htmlUrl}`);

      await page.goto(htmlUrl, {
        waitUntil: "domcontentloaded",
        timeout: 10000,
      });

      // 等待页面稳定
      console.log(`  ⏳ 等待页面稳定...`);
      await page.waitForTimeout(1000);

      // 截图
      console.log(`  📷 正在截图...`);
      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
        type: "png",
        timeout: 5000,
      });

      console.log(`  ✅ 截图成功保存: ${screenshotPath}`);

      // 获取文件信息
      const stats = await fs.stat(screenshotPath);
      console.log(`  📊 文件大小: ${(stats.size / 1024).toFixed(2)} KB`);
    } catch (error) {
      console.error(`  ❌ 处理失败: ${error.message}`);
      throw error; // 让测试失败，便于调试
    }
  });

  test("显示可用HTML文件列表", async () => {
    // 这个测试用于显示所有可用的HTML文件，方便用户选择
    try {
      const allHtmlFiles = await fs.readdir(HTML_FOLDER);
      const htmlFiles = allHtmlFiles.filter((file) => file.endsWith(".html"));

      console.log(`\n📋 html/ 文件夹中发现 ${htmlFiles.length} 个HTML文件:`);
      htmlFiles.slice(0, 10).forEach((file, index) => {
        const isTarget = file === TARGET_HTML_FILE;
        const marker = isTarget ? " 👈 当前目标" : "";
        console.log(`  ${index + 1}. ${file}${marker}`);
      });

      if (htmlFiles.length > 10) {
        console.log(`  ... 还有 ${htmlFiles.length - 10} 个文件`);
      }

      console.log(`\n💡 使用方法:`);
      console.log(`   设置环境变量: TARGET_HTML_FILE=你的文件名.html`);
      console.log(`   然后运行: npx playwright test single-capture.spec.js`);
    } catch (error) {
      console.error("读取HTML文件列表失败:", error.message);
    }
  });
});
