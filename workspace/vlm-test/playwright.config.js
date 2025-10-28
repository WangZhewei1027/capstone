import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright配置文件 - 用于VLM测试截图捕获
 */
export default defineConfig({
  // 测试文件目录
  testDir: "./",

  // 全局超时设置
  timeout: 120000, // 2分钟总超时，给整个测试流程更多时间

  // 期望超时设置
  expect: {
    timeout: 5000,
  },

  // 失败时重试次数
  retries: 0, // 不重试，加快处理速度

  // 并行运行的worker数量（设置为1确保顺序处理，避免资源冲突）
  workers: 1,

  // 报告器配置
  reporter: [
    ["html", { outputFolder: "playwright-report" }],
    ["line"],
    ["json", { outputFile: "test-results/results.json" }],
  ],

  // 全局设置
  use: {
    // 浏览器上下文选项
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",

    // 视口大小 - 设置较大的视口以捕获完整内容
    viewport: { width: 1920, height: 1080 },

    // 忽略HTTPS错误
    ignoreHTTPSErrors: true,

    // 额外设置
    actionTimeout: 30000,
    navigationTimeout: 30000,
  },

  // 项目配置 - 只使用Chromium以保持一致性
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // 为截图优化的设置
        deviceScaleFactor: 1,
      },
    },
  ],

  // 输出目录
  outputDir: "test-results/",
});
