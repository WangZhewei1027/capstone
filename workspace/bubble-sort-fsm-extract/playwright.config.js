import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  // 测试文件模式
  testDir: ".",
  testMatch: "fsm-interactive-capture.spec.js",

  // 并行运行配置
  fullyParallel: false, // FSM提取需要序列执行以避免状态干扰
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1, // 单线程确保测试稳定性

  // 报告配置
  reporter: [["html", { outputFolder: "playwright-report" }], ["list"]],

  // 全局配置
  use: {
    // 基础设置
    actionTimeout: 15000,
    navigationTimeout: 15000,

    // 截图配置
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "on-first-retry",

    // 浏览器设置
    headless: !process.env.HEADED, // 设置HEADED=1可以看到浏览器运行
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,

    // FSM提取专用设置
    launchOptions: {
      slowMo: process.env.SLOW_MO ? parseInt(process.env.SLOW_MO) : 100,
      args: [
        "--disable-web-security",
        "--disable-features=VizDisplayCompositor",
        "--no-sandbox",
      ],
    },
  },

  // 项目配置
  projects: [
    {
      name: "fsm-extraction",
      use: { ...devices["Desktop Chrome"] },
      testMatch: "fsm-interactive-capture.spec.js",
    },
  ],

  // 网页服务器配置（如果需要本地服务）
  webServer: process.env.ENABLE_LOCAL_SERVER
    ? {
        command: "python -m http.server 8080",
        url: "http://localhost:8080",
        reuseExistingServer: !process.env.CI,
      }
    : undefined,

  // 输出目录
  outputDir: "test-results/",

  // 超时配置
  timeout: 60000, // FSM提取可能需要较长时间
  expect: {
    timeout: 10000,
  },
});

// 环境变量说明:
// TARGET_HTML_FILE - 指定要分析的HTML文件
// HEADED=1 - 显示浏览器窗口
// SLOW_MO=500 - 减慢操作速度（毫秒）
// ENABLE_LOCAL_SERVER=1 - 启用本地HTTP服务器
