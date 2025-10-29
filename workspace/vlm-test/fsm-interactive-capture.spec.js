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
  process.env.TARGET_HTML_FILE || "65f37f00-b408-11f0-ab52-fbe7249bf639.html";

// 确保目录存在
async function ensureDirectory(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

// 获取HTML文件路径
function getHtmlFilePath(htmlFileName) {
  const htmlFilePath = path.join(HTML_FOLDER, htmlFileName);
  return `file:///${htmlFilePath.replace(/\\/g, "/")}`;
}

// 从页面中提取FSM配置
async function extractFSMFromPage(page) {
  return await page.evaluate(() => {
    const fsmScript = document.getElementById("fsm");
    if (!fsmScript) return null;
    try {
      return JSON.parse(fsmScript.textContent);
    } catch (error) {
      console.error("Failed to parse FSM JSON:", error);
      return null;
    }
  });
}

// 等待页面稳定
async function waitForPageStable(page, timeout = 5000) {
  await page.waitForTimeout(timeout);
}

// 捕获状态截图
async function captureStateScreenshot(
  page,
  stateName,
  screenshotFolder,
  stateIndex
) {
  const screenshotPath = path.join(
    screenshotFolder,
    `${stateIndex.toString().padStart(2, "0")}_${stateName}.png`
  );
  await page.screenshot({
    path: screenshotPath,
    fullPage: true,
    type: "png",
    timeout: 5000,
  });
  console.log(`  📸 状态截图: ${stateName} -> ${screenshotPath}`);
  return screenshotPath;
}

// 执行特定的交互动作
async function performInteraction(page, action, value = null) {
  switch (action) {
    case "CLICK_INSERT":
      // 如果需要输入值，先填入
      if (value !== null) {
        await page.fill("#nodeValue", value.toString());
        await waitForPageStable(page, 100);
      }
      await page.click('button:has-text("Insert Node")');
      break;

    case "CLICK_RESET":
      await page.click('button:has-text("Reset Tree")');
      break;

    case "FILL_VALID_INPUT":
      await page.fill("#nodeValue", value ? value.toString() : "10");
      break;

    case "FILL_INVALID_INPUT":
      await page.fill("#nodeValue", "");
      break;

    case "DISMISS_ALERT":
      // Alert会自动处理，这里只是标记
      break;

    default:
      console.log(`  ⚠️ 未知动作: ${action}`);
  }

  await waitForPageStable(page, 300);
}

// 模拟FSM状态转换并截图
async function simulateFSMStates(page, fsm, screenshotFolder) {
  const states = fsm.states || [];
  let stateIndex = 0;
  let alertHandled = false;

  console.log(`\n🎭 开始模拟 FSM 状态转换 (共 ${states.length} 个状态)`);

  // 预先设置alert处理器，确保所有alert都能被正确处理
  page.on("dialog", async (dialog) => {
    console.log(`    💬 Alert触发: ${dialog.message()}`);
    // 先截图显示alert状态
    await waitForPageStable(page, 100);
    await captureStateScreenshot(
      page,
      "error_alert_active",
      screenshotFolder,
      stateIndex
    );
    // 然后关闭alert
    await dialog.accept();
    alertHandled = true;
    console.log(`    ✅ Alert已处理`);
  });

  // 1. 捕获初始状态 (idle)
  console.log(`\n📍 状态 ${++stateIndex}: idle (初始状态)`);
  await captureStateScreenshot(
    page,
    "idle_initial",
    screenshotFolder,
    stateIndex
  );

  // 2. 模拟有效输入流程: idle -> validating_input -> inserting_node -> drawing_tree -> idle
  console.log(`\n📍 状态 ${++stateIndex}: validating_input (有效输入)`);
  await page.fill("#nodeValue", "10");
  await waitForPageStable(page, 200);
  await captureStateScreenshot(
    page,
    "validating_input_valid",
    screenshotFolder,
    stateIndex
  );

  console.log(`\n📍 状态 ${++stateIndex}: inserting_node (插入第一个节点)`);
  await page.click('button:has-text("Insert Node")');
  await waitForPageStable(page, 300);
  await captureStateScreenshot(
    page,
    "drawing_tree_node_10",
    screenshotFolder,
    stateIndex
  );

  // 3. 逐个添加节点并截图每次树的变化
  const nodesToAdd = [5, 15, 3, 7, 12, 18];
  for (let i = 0; i < nodesToAdd.length; i++) {
    const value = nodesToAdd[i];

    console.log(`\n📍 状态 ${++stateIndex}: 准备插入节点 ${value}`);
    await page.fill("#nodeValue", value.toString());
    await waitForPageStable(page, 100);
    await captureStateScreenshot(
      page,
      `input_ready_node_${value}`,
      screenshotFolder,
      stateIndex
    );

    console.log(`\n📍 状态 ${++stateIndex}: 插入节点 ${value} 后的树结构`);
    await page.click('button:has-text("Insert Node")');
    await waitForPageStable(page, 300);
    await captureStateScreenshot(
      page,
      `drawing_tree_with_node_${value}`,
      screenshotFolder,
      stateIndex
    );
  }

  // 4. 最终复杂树状态
  console.log(`\n📍 状态 ${++stateIndex}: drawing_tree (完整复杂树)`);
  await waitForPageStable(page, 300);
  await captureStateScreenshot(
    page,
    "drawing_tree_complete",
    screenshotFolder,
    stateIndex
  );

  // 5. 模拟无效输入流程: idle -> validating_input -> error_alert -> idle
  console.log(`\n📍 状态 ${++stateIndex}: validating_input (无效输入准备)`);
  await page.fill("#nodeValue", "");
  await waitForPageStable(page, 200);
  await captureStateScreenshot(
    page,
    "validating_input_invalid",
    screenshotFolder,
    stateIndex
  );

  console.log(`\n📍 状态 ${++stateIndex}: error_alert (触发错误提示)`);
  alertHandled = false;
  await page.click('button:has-text("Insert Node")');

  // 等待alert被处理
  let waitCount = 0;
  while (!alertHandled && waitCount < 10) {
    await waitForPageStable(page, 100);
    waitCount++;
  }

  if (!alertHandled) {
    console.log(`    ⚠️ Alert可能未触发，继续测试...`);
  }

  await waitForPageStable(page, 300);

  // 6. 模拟重置流程: idle -> tree_resetting -> idle
  console.log(`\n📍 状态 ${++stateIndex}: tree_resetting (重置前的完整树)`);
  await captureStateScreenshot(
    page,
    "tree_resetting_before",
    screenshotFolder,
    stateIndex
  );

  console.log(`\n📍 状态 ${++stateIndex}: tree_resetting (执行重置)`);
  await page.click('button:has-text("Reset Tree")');
  await waitForPageStable(page, 300);
  await captureStateScreenshot(
    page,
    "tree_resetting_after",
    screenshotFolder,
    stateIndex
  );

  // 7. 验证重置后可以重新插入节点
  console.log(`\n📍 状态 ${++stateIndex}: idle (重置后验证)`);
  await page.fill("#nodeValue", "99");
  await waitForPageStable(page, 200);
  await captureStateScreenshot(
    page,
    "idle_post_reset_input",
    screenshotFolder,
    stateIndex
  );

  console.log(`\n📍 状态 ${++stateIndex}: 重置后插入验证节点`);
  await page.click('button:has-text("Insert Node")');
  await waitForPageStable(page, 300);
  await captureStateScreenshot(
    page,
    "post_reset_verification",
    screenshotFolder,
    stateIndex
  );

  // 8. 最终idle状态
  console.log(`\n📍 状态 ${++stateIndex}: idle (最终状态)`);
  await captureStateScreenshot(
    page,
    "idle_final",
    screenshotFolder,
    stateIndex
  );

  return stateIndex;
}

await ensureDirectory(VISUALS_FOLDER);

test.describe("FSM交互式状态截图捕获", () => {
  test(`基于FSM的交互状态捕获: ${TARGET_HTML_FILE}`, async ({ page }) => {
    const htmlFileName = path.basename(TARGET_HTML_FILE, ".html");

    try {
      console.log(`\n🚀 开始FSM交互测试: ${TARGET_HTML_FILE}`);

      // 设置页面超时
      page.setDefaultTimeout(15000);
      page.setDefaultNavigationTimeout(15000);

      // 创建截图文件夹
      const screenshotFolder = path.join(VISUALS_FOLDER, htmlFileName);
      await ensureDirectory(screenshotFolder);

      // 导航到HTML文件
      const htmlUrl = getHtmlFilePath(TARGET_HTML_FILE);
      console.log(`🌐 导航到: ${htmlUrl}`);

      await page.goto(htmlUrl, {
        waitUntil: "domcontentloaded",
        timeout: 10000,
      });

      await waitForPageStable(page, 1000);

      // 提取FSM配置
      console.log(`📋 提取FSM配置...`);
      const fsm = await extractFSMFromPage(page);

      if (!fsm) {
        throw new Error("无法从页面提取FSM配置");
      }

      console.log(`✅ FSM配置提取成功:`);
      console.log(`   - 主题: ${fsm.topic}`);
      console.log(`   - 状态数: ${fsm.states?.length || 0}`);
      console.log(`   - 事件数: ${fsm.events?.length || 0}`);

      // 执行FSM状态模拟和截图
      const totalScreenshots = await simulateFSMStates(
        page,
        fsm,
        screenshotFolder
      );

      // 生成状态报告
      const reportPath = path.join(screenshotFolder, "fsm_report.json");
      const report = {
        timestamp: new Date().toISOString(),
        html_file: TARGET_HTML_FILE,
        fsm_config: fsm,
        total_screenshots: totalScreenshots,
        screenshot_folder: screenshotFolder,
      };

      await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf-8");

      console.log(`\n🎉 FSM交互测试完成!`);
      console.log(`📊 总计截图: ${totalScreenshots} 张`);
      console.log(`📁 截图位置: ${screenshotFolder}`);
      console.log(`📋 报告文件: ${reportPath}`);
    } catch (error) {
      console.error(`❌ FSM交互测试失败: ${error.message}`);
      throw error;
    }
  });

  test("Alert处理和边界情况测试", async ({ page }) => {
    // 专门测试alert处理和各种边界情况
    const htmlUrl = getHtmlFilePath(TARGET_HTML_FILE);
    await page.goto(htmlUrl, { waitUntil: "domcontentloaded" });

    console.log(`\n🔧 测试Alert处理机制...`);

    // 设置alert处理器
    let alertCount = 0;
    page.on("dialog", async (dialog) => {
      alertCount++;
      console.log(`  📢 Alert ${alertCount}: ${dialog.message()}`);
      await dialog.accept();
    });

    // 测试1: 空输入
    console.log(`\n🧪 测试1: 空输入触发alert`);
    await page.fill("#nodeValue", "");
    await page.click('button:has-text("Insert Node")');
    await waitForPageStable(page, 500);

    // 测试2: 非数字输入 (通过JS设置，绕过HTML5验证)
    console.log(`\n🧪 测试2: 非数字输入触发alert`);
    await page.evaluate(() => {
      document.getElementById("nodeValue").value = "abc";
    });
    await page.click('button:has-text("Insert Node")');
    await waitForPageStable(page, 500);

    // 测试3: 正常输入应该成功
    console.log(`\n🧪 测试3: 正常输入验证`);
    await page.fill("#nodeValue", "42");
    await page.click('button:has-text("Insert Node")');
    await waitForPageStable(page, 500);

    const nodeElements = await page.locator(".node").count();
    console.log(`  ✅ 成功插入节点，当前节点数: ${nodeElements}`);

    console.log(`\n📊 Alert处理统计: 共处理 ${alertCount} 个alert`);

    if (alertCount < 2) {
      console.log(`  ⚠️ 警告: 预期至少2个alert，实际处理了 ${alertCount} 个`);
    } else {
      console.log(`  ✅ Alert处理正常`);
    }
  });

  test("FSM状态映射验证", async ({ page }) => {
    // 这个测试验证FSM配置与实际页面元素的映射关系
    const htmlUrl = getHtmlFilePath(TARGET_HTML_FILE);
    await page.goto(htmlUrl, { waitUntil: "domcontentloaded" });

    const fsm = await extractFSMFromPage(page);
    if (!fsm) {
      throw new Error("无法提取FSM配置");
    }

    console.log(`\n🔍 验证FSM状态映射:`);

    // 验证关键UI元素存在
    const inputElement = await page.locator("#nodeValue");
    const insertButton = await page.locator('button:has-text("Insert Node")');
    const resetButton = await page.locator('button:has-text("Reset Tree")');
    const treeContainer = await page.locator("#treeContainer");

    console.log(`  ✅ 输入框: ${await inputElement.isVisible()}`);
    console.log(`  ✅ 插入按钮: ${await insertButton.isVisible()}`);
    console.log(`  ✅ 重置按钮: ${await resetButton.isVisible()}`);
    console.log(`  ✅ 树容器: ${await treeContainer.isVisible()}`);

    // 验证FSM状态覆盖
    const expectedStates = [
      "idle",
      "validating_input",
      "error_alert",
      "inserting_node",
      "drawing_tree",
      "tree_resetting",
    ];
    const actualStates = fsm.states.map((s) => s.name);

    console.log(`\n📋 FSM状态覆盖检查:`);
    expectedStates.forEach((state) => {
      const exists = actualStates.includes(state);
      console.log(`  ${exists ? "✅" : "❌"} ${state}`);
    });

    console.log(`\n🎯 状态总数: ${actualStates.length}`);
    console.log(`🎯 事件总数: ${fsm.events?.length || 0}`);
  });
});
