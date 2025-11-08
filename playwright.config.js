import { defineConfig, devices } from "@playwright/test";
import path from "path";

/**
 * Playwright配置文件
 * 用于运行FSM生成的测试
 */

// 从环境变量或命令行参数中提取测试路径
const getTestPath = () => {
  // 优先使用环境变量
  if (process.env.PLAYWRIGHT_WORKSPACE) {
    return process.env.PLAYWRIGHT_WORKSPACE;
  }

  // 尝试从命令行参数中提取
  const args = process.argv;
  const testPathIndex = args.findIndex((arg) => arg.includes("workspace/"));
  if (testPathIndex !== -1) {
    const testPath = args[testPathIndex];
    // 提取 workspace/XX-XX-XXXX 部分
    const match = testPath.match(/workspace\/([^\/]+)/);
    if (match) {
      // 设置环境变量供 worker 进程使用
      process.env.PLAYWRIGHT_WORKSPACE = match[1];
      return match[1];
    }
  }
  return null;
};

const workspaceName = getTestPath();
const outputDir = workspaceName
  ? `workspace/${workspaceName}/test-results`
  : "test-results";

export default defineConfig({
  // 全局超时设置
  timeout: 10000,

  // 期望超时设置
  expect: {
    timeout: 5000,
  },

  // 失败时重试次数
  retries: process.env.CI ? 2 : 0,

  // 并行运行的worker数量
  workers: process.env.CI ? 10 : 10,

  // 即使有测试失败也继续运行（关键配置）
  fullyParallel: true, // 完全并行运行
  maxFailures: 0, // 0 表示不限制失败数量，继续运行所有测试

  // 报告器配置
  reporter: [
    ["html", { outputFolder: `${outputDir}/html-report` }],
    ["line"],
    ["json", { outputFile: `${outputDir}/results.json` }],
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

  // 输出目录配置
  outputDir: `${outputDir}/test-artifacts`,

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
