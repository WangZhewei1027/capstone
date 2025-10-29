import { test } from "@playwright/test";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HTML_FOLDER = path.join(__dirname, "html");
const VISUALS_FOLDER = path.join(__dirname, "visuals");
const STRATEGIES_FILE = path.join(__dirname, "test-strategies.json");

let testStrategies = {};

// 加载测试策略配置
async function loadTestStrategies() {
  try {
    const strategiesContent = await fs.readFile(STRATEGIES_FILE, "utf-8");
    testStrategies = JSON.parse(strategiesContent);
    console.log("✅ 测试策略配置加载成功");
  } catch (error) {
    console.error("❌ 无法加载测试策略配置:", error.message);
    // 使用默认配置
    testStrategies = {
      test_strategies: {
        general_interactive: {
          description: "默认通用测试",
          file_patterns: ["*"],
          test_sequences: [],
        },
      },
    };
  }
}

// 确保目录存在
async function ensureDirectory(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

// 获取HTML文件列表
async function getHtmlFiles() {
  try {
    const files = await fs.readdir(HTML_FOLDER);
    return files.filter((file) => file.endsWith(".html")).sort();
  } catch (error) {
    console.error("无法读取HTML文件夹:", error);
    return [];
  }
}

// 获取HTML文件路径
function getHtmlFilePath(htmlFileName) {
  const htmlFilePath = path.join(HTML_FOLDER, htmlFileName);
  return `file:///${htmlFilePath.replace(/\\/g, "/")}`;
}

// 检测应用类型
function detectApplicationType(htmlFileName, pageContent = "") {
  const fileName = htmlFileName.toLowerCase();
  const content = pageContent.toLowerCase();

  for (const [strategyName, strategy] of Object.entries(
    testStrategies.test_strategies || {}
  )) {
    const patterns = strategy.file_patterns || [];

    // 检查文件名模式
    for (const pattern of patterns) {
      const regex = new RegExp(pattern.replace(/\*/g, ".*"));
      if (regex.test(fileName)) {
        return strategyName;
      }
    }

    // 检查内容关键词
    if (content) {
      const keywords = strategy.content_keywords || [];
      if (keywords.some((keyword) => content.includes(keyword))) {
        return strategyName;
      }
    }
  }

  return "general_interactive";
}

// 提取FSM配置
async function extractFSMFromPage(page) {
  return await page.evaluate(() => {
    const fsmScript =
      document.getElementById("fsm") ||
      document.querySelector('script[type="application/json"]');
    if (!fsmScript) return null;
    try {
      return JSON.parse(fsmScript.textContent);
    } catch (error) {
      return null;
    }
  });
}

// 智能元素查找
async function findElementByStrategy(page, elementType) {
  const selectors = testStrategies.element_selectors?.[elementType] || [];

  for (const selector of selectors) {
    try {
      const element = await page.locator(selector).first();
      if (await element.isVisible()) {
        return selector;
      }
    } catch (error) {
      continue;
    }
  }

  return null;
}

// 执行单个步骤
async function executeStep(page, step, screenshotFolder, stepIndex) {
  const timing = testStrategies.timing_settings || {};
  const errorHandling = testStrategies.error_handling || {};

  try {
    switch (step.action) {
      case "input":
        const inputSelector = await findElementByStrategy(page, step.target);
        if (inputSelector) {
          console.log(`    📝 输入 "${step.value}" 到 ${inputSelector}`);
          await page.fill(inputSelector, step.value.toString());
          await page.waitForTimeout(timing.after_input_wait || 300);
        }
        break;

      case "click":
        const buttonSelector = await findElementByStrategy(page, step.target);
        if (buttonSelector) {
          console.log(`    🖱️ 点击 ${buttonSelector}`);
          await page.click(buttonSelector);
          await page.waitForTimeout(timing.after_click_wait || 500);
        }
        break;

      case "screenshot":
        const screenshotName = step.name || `step_${stepIndex}`;
        await takeScreenshot(page, screenshotFolder, screenshotName, stepIndex);
        break;

      case "input_sequence":
        const seqInputSelector = await findElementByStrategy(page, step.target);
        if (seqInputSelector && step.values) {
          for (let i = 0; i < step.values.length; i++) {
            console.log(
              `    📝 序列输入 ${i + 1}/${step.values.length}: "${
                step.values[i]
              }"`
            );
            await page.fill(seqInputSelector, step.values[i].toString());
            await page.waitForTimeout(timing.after_input_wait || 300);

            // 如果有对应的点击操作
            if (step.click_after_each) {
              const clickSelector = await findElementByStrategy(
                page,
                step.click_after_each
              );
              if (clickSelector) {
                await page.click(clickSelector);
                await page.waitForTimeout(timing.after_click_wait || 500);
              }
            }

            // 如果需要每次截图
            if (step.screenshot_after_each) {
              const shotName = step.name_pattern
                ? step.name_pattern
                    .replace("{value}", step.values[i])
                    .replace("{index}", i)
                : `sequence_${i}`;
              await takeScreenshot(
                page,
                screenshotFolder,
                shotName,
                stepIndex * 100 + i
              );
            }
          }
        }
        break;

      case "handle_alert":
        // Alert处理已在页面级别设置
        if (step.screenshot) {
          await takeScreenshot(
            page,
            screenshotFolder,
            step.screenshot,
            stepIndex
          );
        }
        break;

      default:
        console.log(`    ⚠️ 未知步骤类型: ${step.action}`);
    }

    return true;
  } catch (error) {
    console.error(`    ❌ 步骤执行失败: ${error.message}`);

    if (errorHandling.capture_error_screenshots) {
      await takeScreenshot(
        page,
        screenshotFolder,
        `error_step_${stepIndex}`,
        stepIndex
      );
    }

    return errorHandling.continue_on_interaction_error !== false;
  }
}

// 截图函数
async function takeScreenshot(page, folder, name, index) {
  const settings = testStrategies.screenshot_settings || {};
  const filename = `${index.toString().padStart(3, "0")}_${name}.png`;
  const screenshotPath = path.join(folder, filename);

  try {
    await page.screenshot({
      path: screenshotPath,
      fullPage: settings.fullPage !== false,
      type: settings.type || "png",
      timeout: settings.timeout || 10000,
    });
    console.log(`  📸 ${filename}`);
    return screenshotPath;
  } catch (error) {
    console.error(`  ❌ 截图失败 ${filename}:`, error.message);
    return null;
  }
}

// 执行策略化测试
async function executeStrategyTest(page, htmlFileName, strategy) {
  const fileBaseName = path.basename(htmlFileName, ".html");
  console.log(`\n🎯 执行策略测试: ${strategy.description}`);

  // 创建截图文件夹
  const screenshotFolder = path.join(VISUALS_FOLDER, fileBaseName);
  await ensureDirectory(screenshotFolder);

  // 导航到页面
  const htmlUrl = getHtmlFilePath(htmlFileName);
  await page.goto(htmlUrl, { waitUntil: "domcontentloaded", timeout: 15000 });

  const timing = testStrategies.timing_settings || {};
  await page.waitForTimeout(timing.page_load_wait || 2000);

  let stepIndex = 0;
  let totalScreenshots = 0;

  // 设置alert处理器
  page.on("dialog", async (dialog) => {
    console.log(`    💬 Alert: ${dialog.message()}`);
    await takeScreenshot(page, screenshotFolder, "alert", ++stepIndex);
    await dialog.accept();
    await page.waitForTimeout(timing.after_alert_wait || 1000);
  });

  // 初始截图
  await takeScreenshot(page, screenshotFolder, "initial", ++stepIndex);
  totalScreenshots++;

  // 提取FSM信息
  const fsm = await extractFSMFromPage(page);
  if (fsm) {
    console.log(`📋 发现FSM配置: ${fsm.topic || "Unknown Topic"}`);
  }

  // 执行测试序列
  for (const sequence of strategy.test_sequences || []) {
    console.log(`\n🔄 执行序列: ${sequence.description}`);

    for (const step of sequence.steps || []) {
      const success = await executeStep(
        page,
        step,
        screenshotFolder,
        ++stepIndex
      );
      totalScreenshots++;

      if (
        !success &&
        !testStrategies.error_handling?.continue_on_interaction_error
      ) {
        console.log(`    🛑 序列因错误中断`);
        break;
      }
    }
  }

  // 最终截图
  await takeScreenshot(page, screenshotFolder, "final", ++stepIndex);
  totalScreenshots++;

  // 生成测试报告
  const report = {
    timestamp: new Date().toISOString(),
    html_file: htmlFileName,
    strategy_used: strategy.description,
    fsm_config: fsm,
    total_screenshots: totalScreenshots,
    total_steps: stepIndex,
    screenshot_folder: screenshotFolder,
  };

  const reportPath = path.join(screenshotFolder, "strategy_test_report.json");
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf-8");

  console.log(
    `✅ 策略测试完成: ${totalScreenshots} 张截图, ${stepIndex} 个步骤`
  );
  return totalScreenshots;
}

// 初始化
await loadTestStrategies();
await ensureDirectory(VISUALS_FOLDER);

test.describe("智能策略化FSM测试", () => {
  // 测试指定文件
  const TARGET_FILE = process.env.TARGET_HTML_FILE;

  if (TARGET_FILE) {
    test(`策略测试: ${TARGET_FILE}`, async ({ page }) => {
      page.setDefaultTimeout(20000);

      const applicationType = detectApplicationType(TARGET_FILE);
      const strategy = testStrategies.test_strategies[applicationType];

      console.log(`🎯 检测到应用类型: ${applicationType}`);
      console.log(`📋 使用策略: ${strategy?.description || "默认策略"}`);

      await executeStrategyTest(page, TARGET_FILE, strategy);
    });
  } else {
    // 批量智能测试
    test("批量智能策略测试", async ({ page }) => {
      page.setDefaultTimeout(20000);

      const htmlFiles = await getHtmlFiles();
      console.log(`🔍 发现 ${htmlFiles.length} 个HTML文件`);

      const testResults = [];
      let totalScreenshots = 0;

      for (const htmlFile of htmlFiles) {
        try {
          console.log(`\n🚀 分析文件: ${htmlFile}`);

          // 检测应用类型
          const applicationType = detectApplicationType(htmlFile);
          const strategy = testStrategies.test_strategies[applicationType];

          console.log(`🎯 检测类型: ${applicationType}`);
          console.log(`📋 策略: ${strategy?.description || "默认策略"}`);

          // 执行策略测试
          const screenshots = await executeStrategyTest(
            page,
            htmlFile,
            strategy
          );
          totalScreenshots += screenshots;

          testResults.push({
            file: htmlFile,
            application_type: applicationType,
            strategy: strategy?.description,
            screenshots: screenshots,
            status: "success",
          });
        } catch (error) {
          console.error(`❌ ${htmlFile} 测试失败:`, error.message);
          testResults.push({
            file: htmlFile,
            application_type: "unknown",
            strategy: "none",
            screenshots: 0,
            status: "failed",
            error: error.message,
          });
        }
      }

      // 生成批量测试总结
      const summary = {
        timestamp: new Date().toISOString(),
        total_files: htmlFiles.length,
        total_screenshots: totalScreenshots,
        success_count: testResults.filter((r) => r.status === "success").length,
        success_rate: `${(
          (testResults.filter((r) => r.status === "success").length /
            htmlFiles.length) *
          100
        ).toFixed(1)}%`,
        application_types: [
          ...new Set(testResults.map((r) => r.application_type)),
        ],
        strategies_used: [
          ...new Set(testResults.map((r) => r.strategy).filter(Boolean)),
        ],
        results: testResults,
      };

      const summaryPath = path.join(
        VISUALS_FOLDER,
        "intelligent_test_summary.json"
      );
      await fs.writeFile(
        summaryPath,
        JSON.stringify(summary, null, 2),
        "utf-8"
      );

      console.log(`\n🎉 智能批量测试完成!`);
      console.log(
        `📊 统计: ${htmlFiles.length} 文件, ${totalScreenshots} 截图`
      );
      console.log(`✅ 成功率: ${summary.success_rate}`);
      console.log(`🎯 应用类型: ${summary.application_types.join(", ")}`);
      console.log(`📋 使用策略: ${summary.strategies_used.join(", ")}`);
      console.log(`📄 详细报告: ${summaryPath}`);
    });
  }

  // 专门的BST应用深度测试
  test("BST应用深度测试", async ({ page }) => {
    page.setDefaultTimeout(25000);

    const htmlFiles = await getHtmlFiles();
    const bstFiles = htmlFiles.filter(
      (file) =>
        file.toLowerCase().includes("bst") ||
        file.toLowerCase().includes("tree") ||
        file.toLowerCase().includes("binary")
    );

    if (bstFiles.length === 0) {
      console.log("⚠️ 未发现BST应用文件");
      return;
    }

    console.log(`🌳 发现 ${bstFiles.length} 个BST应用`);

    const bstStrategy = testStrategies.test_strategies.binary_search_tree;

    for (const bstFile of bstFiles) {
      console.log(`\n🌳 深度测试BST应用: ${bstFile}`);

      try {
        await executeStrategyTest(page, bstFile, bstStrategy);

        // 额外的BST特定测试
        const fileBaseName = path.basename(bstFile, ".html");
        const screenshotFolder = path.join(VISUALS_FOLDER, fileBaseName);

        console.log(`  🧪 执行BST特定深度测试...`);

        await page.goto(getHtmlFilePath(bstFile), {
          waitUntil: "domcontentloaded",
        });
        await page.waitForTimeout(2000);

        // 测试边界情况
        const edgeCases = [
          { values: [1], description: "单节点树" },
          { values: [1, 2, 3, 4, 5], description: "右偏树" },
          { values: [5, 4, 3, 2, 1], description: "左偏树" },
          { values: [0, -1, 100, 999], description: "特殊数值" },
        ];

        let caseIndex = 200; // 避免与常规测试冲突

        for (const testCase of edgeCases) {
          console.log(
            `    🎯 测试 ${testCase.description}: [${testCase.values.join(
              ", "
            )}]`
          );

          // 重置树
          try {
            await page.click(
              'button:has-text("Reset"), button:has-text("Clear")'
            );
            await page.waitForTimeout(500);
          } catch (error) {
            console.log(`    ⚠️ 无法重置: ${error.message}`);
          }

          // 插入测试序列
          for (const value of testCase.values) {
            try {
              const inputSelector = await findElementByStrategy(
                page,
                "number_input"
              );
              const buttonSelector = await findElementByStrategy(
                page,
                "insert_button"
              );

              if (inputSelector && buttonSelector) {
                await page.fill(inputSelector, value.toString());
                await page.click(buttonSelector);
                await page.waitForTimeout(600);
                await takeScreenshot(
                  page,
                  screenshotFolder,
                  `edge_${testCase.description.replace(/\s+/g, "_")}_${value}`,
                  ++caseIndex
                );
              }
            } catch (error) {
              console.log(`      ❌ 插入 ${value} 失败: ${error.message}`);
              break;
            }
          }
        }

        console.log(`  ✅ BST深度测试完成`);
      } catch (error) {
        console.error(`❌ BST应用 ${bstFile} 深度测试失败:`, error.message);
      }
    }
  });
});
