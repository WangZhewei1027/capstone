import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright配置文件
 * 用于运行FSM生成的测试
 */
export default defineConfig({
  // 全局超时设置
  timeout: 30000,

  // 期望超时设置
  expect: {
    timeout: 5000,
  },

  // 失败时重试次数
  retries: process.env.CI ? 2 : 0,

  // 并行运行的worker数量
  workers: process.env.CI ? 1 : undefined,

  // 报告器配置
  reporter: [
    ["html"],
    ["line"],
    ["json", { outputFile: "test-results/results.json" }],
  ],

  // 全局设置
  use: {
    // 基础URL（用于相对路径）
    baseURL: "file://",

    // 浏览器上下文选项
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",

    // 视口大小
    viewport: { width: 1280, height: 720 },

    // 忽略HTTPS错误
    ignoreHTTPSErrors: true,
  },

  // 项目配置 - 定义要运行的浏览器
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },

    // {
    //   name: "firefox",
    //   use: { ...devices["Desktop Firefox"] },
    // },

    // {
    //   name: "webkit",
    //   use: { ...devices["Desktop Safari"] },
    // },

    // 移动浏览器测试
    // {
    //   name: "Mobile Chrome",
    //   use: { ...devices["Pixel 5"] },
    // },
    // {
    //   name: "Mobile Safari",
    //   use: { ...devices["iPhone 12"] },
    // },
  ],

  // Web服务器配置（如果需要）
  // webServer: {
  //   command: 'npm run start',
  //   port: 3000,
  //   reuseExistingServer: !process.env.CI,
  // },
});
