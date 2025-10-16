import { test, expect } from "@playwright/test";

// 测试概念: bubble sort
// 生成时间: 2025-10-14T12:59:16.047Z

test.describe("bubble sort", () => {
  test.beforeEach(async ({ page }) => {
    // 导航到HTML文件
    await page.goto(
      "file:///Users/wangzhewei/Working/capstone/workspace/10-14-0001/html/7b6ef870-a8c1-11f0-b671-bdc8446eb0e6.html"
    );

    // 等待页面加载完成
    await page.waitForLoadState("networkidle");
  });

  test("状态: idle", async ({ page }) => {
    // 断言: 检查状态
    await expect(page.locator('[data-testid="status"]')).toHaveAttribute(
      "data-state",
      "idle"
    );
    // 断言: 检查状态
    await expect(page.locator('[data-testid="status"]')).toHaveText("Idle");

    // 事件触发: START -> running
    await page.locator('[data-testid="start-btn"]').click();

    // 验证转换到状态: running

    // 事件触发: STEP -> paused
    await page.locator('[data-testid="step-btn"]').click();

    // 验证转换到状态: paused

    // 事件触发: GENERATE -> idle
    await page.locator('[data-testid="generate-btn"]').click();

    // 验证转换到状态: idle
  });

  test("状态: running", async ({ page }) => {
    // 断言: 检查状态
    await expect(page.locator('[data-testid="status"]')).toHaveAttribute(
      "data-state",
      "running"
    );
    // 断言: 检查状态
    await expect(page.locator('[data-testid="status"]')).toHaveText("Running");

    // 事件触发: PAUSE -> paused
    await page.locator('[data-testid="pause-btn"]').click();

    // 验证转换到状态: paused

    // 事件触发: GENERATE -> idle
    await page.locator('[data-testid="generate-btn"]').click();

    // 验证转换到状态: idle
  });

  test("状态: paused", async ({ page }) => {
    // 断言: 检查状态
    await expect(page.locator('[data-testid="status"]')).toHaveAttribute(
      "data-state",
      "paused"
    );
    // 断言: 检查状态
    await expect(page.locator('[data-testid="status"]')).toHaveText("Paused");

    // 事件触发: START -> running
    await page.locator('[data-testid="start-btn"]').click();

    // 验证转换到状态: running

    // 事件触发: STEP -> paused
    await page.locator('[data-testid="step-btn"]').click();

    // 验证转换到状态: paused

    // 事件触发: GENERATE -> idle
    await page.locator('[data-testid="generate-btn"]').click();

    // 验证转换到状态: idle
  });

  test("状态: done", async ({ page }) => {
    // 断言: 检查状态
    await expect(page.locator('[data-testid="status"]')).toHaveAttribute(
      "data-state",
      "done"
    );
    // 断言: 检查状态
    await expect(page.locator('[data-testid="status"]')).toHaveText("Done");
    // 断言: 检查状态

    // 事件触发: GENERATE -> idle
    await page.locator('[data-testid="generate-btn"]').click();

    // 验证转换到状态: idle
  });

  test("完整用户流程", async ({ page }) => {
    // 从初始状态开始
    const initialState = "idle";

    // 步骤 1: 触发事件 GENERATE
    await page.locator('[data-testid="generate-btn"]').click();
    await page.waitForTimeout(500); // 等待动画完成
    // 步骤 2: 触发事件 START
    await page.locator('[data-testid="start-btn"]').click();
    await page.waitForTimeout(500); // 等待动画完成
    // 步骤 3: 触发事件 PAUSE
    await page.locator('[data-testid="pause-btn"]').click();
    await page.waitForTimeout(500); // 等待动画完成

    // 截图以供调试
    await page.screenshot({ path: "test-results/bubble sort-final-state.png" });
  });
});
