import { test, expect } from "@playwright/test";
import { promises as fs } from "fs";
import { join } from "path";

const HTML_FILE = "65f023a0-b408-11f0-ab52-fbe7249bf639.html";
const VISUAL_FOLDER = `./visuals/${HTML_FILE.replace(".html", "")}`;

test.describe("Deque交互测试", () => {
  let page;
  let screenshotIndex = 0;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();

    // 设置视口大小
    await page.setViewportSize({ width: 1200, height: 800 });

    // 创建截图文件夹
    try {
      await fs.mkdir(VISUAL_FOLDER, { recursive: true });
    } catch (error) {
      // 文件夹已存在
    }

    // 加载页面
    const filePath = join(process.cwd(), "html", HTML_FILE);
    await page.goto(`file:///${filePath.replace(/\\/g, "/")}`);

    // 等待页面完全加载
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1000);

    // 捕获初始状态
    await captureScreenshot("01_initial_state", "初始空队列状态");
  });

  test("完整Deque操作流程测试", async () => {
    console.log("🚀 开始Deque完整操作流程测试");

    // 提取并显示FSM配置
    const fsmConfig = await extractFSMConfig();
    if (fsmConfig) {
      console.log(`📋 FSM配置: ${fsmConfig.topic}`);
      console.log(
        `📊 状态数: ${fsmConfig.states?.length || 0}, 事件数: ${
          fsmConfig.events?.length || 0
        }`
      );
    }

    // 验证初始状态
    await expect(page.locator("#deque-display")).toBeVisible();
    await expect(page.locator("#element-input")).toBeVisible();
    await expect(page.locator("#add-front")).toBeVisible();
    await expect(page.locator("#add-back")).toBeVisible();
    await expect(page.locator("#remove-front")).toBeVisible();
    await expect(page.locator("#remove-back")).toBeVisible();

    // 测试1: 向前端添加元素 (对应FSM状态: idle -> validating_front_input -> adding_to_front -> updating_display -> clearing_input -> idle)
    console.log(
      "📝 测试向前端添加元素 (FSM路径: idle -> validating_front_input -> adding_to_front)"
    );
    await addToFront("A");
    await addToFront("B");
    await addToFront("C");

    // 测试2: 向后端添加元素 (对应FSM状态: idle -> validating_back_input -> adding_to_back -> updating_display -> clearing_input -> idle)
    console.log(
      "📝 测试向后端添加元素 (FSM路径: idle -> validating_back_input -> adding_to_back)"
    );
    await addToBack("X");
    await addToBack("Y");
    await addToBack("Z");

    // 验证当前队列状态: [C, B, A, X, Y, Z]
    await verifyDequeContent(["C", "B", "A", "X", "Y", "Z"]);
    await captureScreenshot(
      "07_mixed_additions_complete",
      "混合添加操作完成 - [C,B,A,X,Y,Z]"
    );

    // 测试3: 从前端移除元素 (对应FSM状态: idle -> removing_from_front -> performing_front_removal -> updating_display -> idle)
    console.log(
      "📝 测试从前端移除元素 (FSM路径: idle -> removing_from_front -> performing_front_removal)"
    );
    await removeFromFront(); // 移除C -> [B, A, X, Y, Z]
    await removeFromFront(); // 移除B -> [A, X, Y, Z]

    // 测试4: 从后端移除元素 (对应FSM状态: idle -> removing_from_back -> performing_back_removal -> updating_display -> idle)
    console.log(
      "📝 测试从后端移除元素 (FSM路径: idle -> removing_from_back -> performing_back_removal)"
    );
    await removeFromBack(); // 移除Z -> [A, X, Y]
    await removeFromBack(); // 移除Y -> [A, X]

    // 测试5: 继续混合操作
    console.log("📝 测试继续混合操作");
    await addToFront("1"); // [1, A, X]
    await addToBack("2"); // [1, A, X, 2]
    await removeFromFront(); // [A, X, 2]
    await addToFront("3"); // [3, A, X, 2]

    // 测试6: 清空队列
    console.log("📝 测试清空队列");
    await removeFromFront(); // [A, X, 2]
    await removeFromFront(); // [X, 2]
    await removeFromBack(); // [X]
    await removeFromBack(); // []

    // 验证空队列状态
    await verifyDequeContent([]);
    await captureScreenshot("18_final_empty_state", "最终空队列状态");

    // 测试7: 对空队列的移除操作（应该没有效果，对应FSM: idle -> removing_from_front/back -> DEQUE_EMPTY -> idle）
    console.log(
      "📝 测试空队列移除操作 (FSM路径: idle -> removing -> DEQUE_EMPTY -> idle)"
    );
    await removeFromFront(); // 应该没有效果
    await removeFromBack(); // 应该没有效果
    await verifyDequeContent([]);
    await captureScreenshot("19_empty_remove_operations", "空队列移除操作测试");

    // 测试8: 空输入测试（对应FSM: idle -> validating_input -> INPUT_EMPTY -> idle）
    console.log(
      "📝 测试空输入 (FSM路径: idle -> validating_input -> INPUT_EMPTY -> idle)"
    );
    await testEmptyInput();

    // 测试9: 边界值测试
    console.log("📝 测试边界值和特殊字符");
    await addToFront("Hello World"); // 长字符串
    await addToBack("123"); // 数字字符串
    await addToBack("!@#$%"); // 特殊字符

    await captureScreenshot(
      "22_special_characters_test",
      "特殊字符和边界值测试"
    );

    await captureScreenshot(
      "22_special_characters_test",
      "特殊字符和边界值测试"
    );

    console.log("✅ Deque完整操作流程测试完成");
  });

  test("Deque数据结构特性验证", async () => {
    console.log("🧪 开始Deque数据结构特性验证测试");

    // 验证FIFO特性（先进先出）- 只使用后端添加，前端移除
    console.log("📝 验证FIFO特性（后端添加，前端移除）");
    await addToBack("First");
    await addToBack("Second");
    await addToBack("Third");

    await captureScreenshot(
      "04_fifo_setup",
      "FIFO测试设置 - [First,Second,Third]"
    );

    // 按FIFO顺序移除
    await removeFromFront(); // 移除First
    await removeFromFront(); // 移除Second
    await removeFromFront(); // 移除Third

    await captureScreenshot("07_fifo_complete", "FIFO测试完成 - 空队列");

    // 验证LIFO特性（后进先出）- 只使用前端添加和移除
    console.log("📝 验证LIFO特性（前端添加和移除）");
    await addToFront("Stack1");
    await addToFront("Stack2");
    await addToFront("Stack3");

    await captureScreenshot(
      "10_lifo_setup",
      "LIFO测试设置 - [Stack3,Stack2,Stack1]"
    );

    // 按LIFO顺序移除
    await removeFromFront(); // 移除Stack3
    await removeFromFront(); // 移除Stack2
    await removeFromFront(); // 移除Stack1

    await captureScreenshot("13_lifo_complete", "LIFO测试完成 - 空队列");

    console.log("✅ Deque数据结构特性验证完成");
  });

  test("Deque UI状态测试", async () => {
    console.log("🎨 开始Deque UI状态测试");

    // 测试各种输入状态
    await page.fill("#element-input", "TestValue");
    await captureScreenshot("02_input_filled", "输入框填充状态");

    await page.click("#add-front");
    await captureScreenshot("03_after_add_front", "前端添加后状态");

    // 测试按钮悬停效果（如果可能）
    await page.hover("#add-back");
    await captureScreenshot("04_button_hover", "按钮悬停状态");

    // 测试多个元素的显示
    for (let i = 1; i <= 5; i++) {
      await page.fill("#element-input", `Item${i}`);
      await page.click("#add-back");
      await captureScreenshot(
        `05_multiple_items_${i}`,
        `多元素显示状态 - ${i + 1}个元素`
      );
    }

    console.log("✅ Deque UI状态测试完成");
  });

  // 辅助函数
  async function extractFSMConfig() {
    try {
      return await page.evaluate(() => {
        const fsmScript = document.querySelector(
          'script#fsm[type="application/json"]'
        );
        if (fsmScript) {
          return JSON.parse(fsmScript.textContent);
        }
        return null;
      });
    } catch (error) {
      console.log("⚠️ FSM配置提取失败:", error.message);
      return null;
    }
  }

  async function testEmptyInput() {
    // 测试空字符串输入
    await page.fill("#element-input", "");
    await page.click("#add-front");
    await page.waitForTimeout(300);
    await captureScreenshot("empty_string_test", "空字符串输入测试");

    // 测试纯空格输入
    await page.fill("#element-input", "   ");
    await page.click("#add-back");
    await page.waitForTimeout(300);
    await captureScreenshot("whitespace_test", "空格输入测试");

    // 验证队列仍然为空
    await verifyDequeContent([]);
  }

  async function addToFront(value) {
    await page.fill("#element-input", value);
    await page.click("#add-front");
    await page.waitForTimeout(500); // 等待UI更新
    await captureScreenshot(
      `${screenshotIndex.toString().padStart(2, "0")}_add_front_${value}`,
      `向前端添加: ${value}`
    );
  }

  async function addToBack(value) {
    await page.fill("#element-input", value);
    await page.click("#add-back");
    await page.waitForTimeout(500); // 等待UI更新
    await captureScreenshot(
      `${screenshotIndex.toString().padStart(2, "0")}_add_back_${value}`,
      `向后端添加: ${value}`
    );
  }

  async function removeFromFront() {
    await page.click("#remove-front");
    await page.waitForTimeout(500); // 等待UI更新
    await captureScreenshot(
      `${screenshotIndex.toString().padStart(2, "0")}_remove_front`,
      "从前端移除元素"
    );
  }

  async function removeFromBack() {
    await page.click("#remove-back");
    await page.waitForTimeout(500); // 等待UI更新
    await captureScreenshot(
      `${screenshotIndex.toString().padStart(2, "0")}_remove_back`,
      "从后端移除元素"
    );
  }

  async function verifyDequeContent(expectedElements) {
    // 验证队列内容
    const infoText = await page.textContent("#info");
    const expectedText = `Current Deque: [${expectedElements.join(", ")}]`;

    console.log(`🔍 验证队列内容: 期望 "${expectedText}", 实际 "${infoText}"`);
    expect(infoText).toBe(expectedText);

    // 验证视觉元素数量
    const elementCount = await page.locator(".element").count();
    expect(elementCount).toBe(expectedElements.length);

    // 验证每个元素的内容
    for (let i = 0; i < expectedElements.length; i++) {
      const elementText = await page.locator(".element").nth(i).textContent();
      expect(elementText).toBe(expectedElements[i]);
    }
  }

  async function captureScreenshot(name, description) {
    screenshotIndex++;
    const paddedIndex = screenshotIndex.toString().padStart(3, "0");
    const fileName = `${paddedIndex}_${name}.png`;
    const filePath = join(VISUAL_FOLDER, fileName);

    try {
      await page.screenshot({
        path: filePath,
        fullPage: true,
      });
      console.log(`📸 截图保存: ${fileName} - ${description}`);
    } catch (error) {
      console.error(`❌ 截图失败: ${fileName} - ${error.message}`);
    }
  }

  test.afterEach(async () => {
    if (page) {
      await page.close();
    }
  });
});
