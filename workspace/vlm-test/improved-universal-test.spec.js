import { test, expect } from "@playwright/test";
import { readdir, readFile } from "fs/promises";
import { join } from "path";

const HTML_FOLDER = "./html";
const VISUALS_FOLDER = "./visuals";

test.describe("改进的通用FSM测试", () => {
  test("批量快速验证所有HTML文件", async ({ page }) => {
    console.log("🔍 发现HTML文件...");

    let htmlFiles;
    try {
      const files = await readdir(HTML_FOLDER);
      htmlFiles = files.filter((file) => file.endsWith(".html")).sort();
      console.log(`📁 发现 ${htmlFiles.length} 个HTML文件`);
    } catch (error) {
      console.error("❌ 无法读取HTML文件夹:", error);
      return;
    }

    const results = [];
    let successCount = 0;

    for (const fileName of htmlFiles) {
      console.log(`\n🚀 快速测试: ${fileName}`);

      try {
        const result = await quickTestFile(page, fileName);
        results.push(result);
        if (result.success) successCount++;

        console.log(
          `${result.success ? "✅" : "❌"} ${fileName}: ${result.summary}`
        );
      } catch (error) {
        console.error(`❌ 测试失败 ${fileName}:`, error.message);
        results.push({
          file: fileName,
          success: false,
          error: error.message,
          summary: "测试异常",
        });
      }
    }

    console.log(`\n🎉 批量测试完成!`);
    console.log(
      `📊 成功率: ${successCount}/${htmlFiles.length} (${(
        (successCount / htmlFiles.length) *
        100
      ).toFixed(1)}%)`
    );

    // 保存简要报告
    const summaryReport = {
      timestamp: new Date().toISOString(),
      total_files: htmlFiles.length,
      success_count: successCount,
      success_rate: `${((successCount / htmlFiles.length) * 100).toFixed(1)}%`,
      results: results,
    };

    await page.evaluate((report) => {
      console.log("📄 测试报告:", JSON.stringify(report, null, 2));
    }, summaryReport);
  });

  test("详细测试指定文件", async ({ page }) => {
    // 可以通过环境变量指定要详细测试的文件
    const targetFile = process.env.TARGET_HTML_FILE;

    if (!targetFile) {
      console.log("⚠️ 未指定目标文件，跳过详细测试");
      console.log("💡 使用环境变量 TARGET_HTML_FILE 指定要测试的文件");
      return;
    }

    console.log(`🎯 详细测试: ${targetFile}`);

    const result = await detailedTestFile(page, targetFile);
    console.log(
      `\n${result.success ? "✅" : "❌"} 详细测试${
        result.success ? "成功" : "失败"
      }`
    );
    console.log(`📊 ${result.summary}`);

    if (result.screenshots) {
      console.log(`📸 生成截图: ${result.screenshots} 张`);
    }
  });
});

// 快速测试单个文件
async function quickTestFile(page, fileName) {
  const startTime = Date.now();
  let screenshotCount = 0;

  try {
    // 设置错误处理
    page.on("dialog", async (dialog) => {
      console.log(`💬 处理对话框: ${dialog.message()}`);
      await dialog.accept();
    });

    page.on("pageerror", (error) => {
      console.log(`🔧 页面错误: ${error.message}`);
    });

    // 导航到页面
    const fileUrl = `file:///${process
      .cwd()
      .replace(/\\/g, "/")}/${HTML_FOLDER}/${fileName}`;
    await page.goto(fileUrl, { waitUntil: "domcontentloaded", timeout: 10000 });

    // 等待页面稳定
    await page.waitForTimeout(1000);

    // 初始截图
    await safeScreenshot(page, `${fileName}_initial.png`);
    screenshotCount++;

    // 尝试发现FSM配置
    const fsmConfig = await extractFSMConfig(page);
    let fsmInfo = "无FSM配置";
    if (fsmConfig) {
      fsmInfo = `${fsmConfig.states?.length || 0}状态, ${
        fsmConfig.events?.length || 0
      }事件`;
    }

    // 快速交互测试
    const interactionResults = await quickInteractionTest(page);
    screenshotCount += interactionResults.screenshots;

    const duration = Date.now() - startTime;

    return {
      file: fileName,
      success: true,
      summary: `${fsmInfo}, ${interactionResults.interactions}个交互, ${duration}ms`,
      screenshots: screenshotCount,
      duration: duration,
      fsm: fsmConfig ? true : false,
      interactions: interactionResults.interactions,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      file: fileName,
      success: false,
      summary: `错误: ${error.message.substring(0, 50)}...`,
      screenshots: screenshotCount,
      duration: duration,
      error: error.message,
    };
  }
}

// 详细测试单个文件
async function detailedTestFile(page, fileName) {
  const startTime = Date.now();
  let screenshotCount = 0;

  try {
    // 设置更详细的错误处理
    const errors = [];
    page.on("dialog", async (dialog) => {
      console.log(`💬 对话框: ${dialog.message()}`);
      await dialog.accept();
    });

    page.on("pageerror", (error) => {
      errors.push(error.message);
      console.log(`🔧 页面错误: ${error.message}`);
    });

    // 导航到页面
    const fileUrl = `file:///${process
      .cwd()
      .replace(/\\/g, "/")}/${HTML_FOLDER}/${fileName}`;
    await page.goto(fileUrl, { waitUntil: "domcontentloaded", timeout: 15000 });

    // 等待页面完全加载
    await page.waitForTimeout(2000);

    // 初始截图
    await safeScreenshot(page, `${fileName}_initial.png`);
    screenshotCount++;

    // 提取FSM配置
    const fsmConfig = await extractFSMConfig(page);
    console.log(
      "📋 FSM配置:",
      fsmConfig ? `${fsmConfig.title || "未命名"}` : "未发现"
    );

    // 发现页面元素
    const elements = await discoverPageElements(page);
    console.log(
      "🔍 发现元素:",
      `按钮:${elements.buttons.length}, 输入:${elements.inputs.length}, 其他:${elements.others.length}`
    );

    // 详细交互测试
    const detailedResults = await detailedInteractionTest(
      page,
      elements,
      fsmConfig
    );
    screenshotCount += detailedResults.screenshots;

    const duration = Date.now() - startTime;

    return {
      file: fileName,
      success: true,
      summary: `详细测试完成, ${detailedResults.successful_interactions}/${detailedResults.total_interactions}个交互成功`,
      screenshots: screenshotCount,
      duration: duration,
      fsm: fsmConfig,
      elements: elements,
      interactions: detailedResults,
      errors: errors,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      file: fileName,
      success: false,
      summary: `详细测试失败: ${error.message}`,
      screenshots: screenshotCount,
      duration: duration,
      error: error.message,
    };
  }
}

// 安全截图函数
async function safeScreenshot(page, filename, folder = "quick_screenshots") {
  try {
    // 确保页面稳定
    await page.waitForTimeout(500);

    // 检查是否有活动对话框
    try {
      await page.screenshot({
        path: `${VISUALS_FOLDER}/${folder}/${filename}`,
        fullPage: false,
        timeout: 5000,
      });
      return true;
    } catch (screenshotError) {
      console.log(`⚠️ 截图失败: ${filename} - ${screenshotError.message}`);
      return false;
    }
  } catch (error) {
    console.log(`⚠️ 截图异常: ${filename} - ${error.message}`);
    return false;
  }
}

// 提取FSM配置
async function extractFSMConfig(page) {
  try {
    return await page.evaluate(() => {
      const scripts = document.querySelectorAll("script");
      for (const script of scripts) {
        const content = script.textContent;
        if (content.includes("states") && content.includes("events")) {
          try {
            // 尝试多种FSM配置格式
            const patterns = [
              /const\s+fsm\s*=\s*(\{[\s\S]*?\});/,
              /var\s+fsm\s*=\s*(\{[\s\S]*?\});/,
              /let\s+fsm\s*=\s*(\{[\s\S]*?\});/,
              /fsm\s*:\s*(\{[\s\S]*?\})/,
              /fsmConfig\s*=\s*(\{[\s\S]*?\});/,
            ];

            for (const pattern of patterns) {
              const match = content.match(pattern);
              if (match) {
                const configStr = match[1];
                return Function('"use strict"; return (' + configStr + ")")();
              }
            }
          } catch (e) {
            console.log("FSM配置解析失败:", e.message);
          }
        }
      }
      return null;
    });
  } catch (error) {
    return null;
  }
}

// 发现页面元素
async function discoverPageElements(page) {
  try {
    return await page.evaluate(() => {
      const elements = {
        buttons: [],
        inputs: [],
        others: [],
      };

      // 查找按钮
      const buttons = document.querySelectorAll(
        'button, input[type="button"], input[type="submit"]'
      );
      for (const btn of buttons) {
        elements.buttons.push({
          selector: btn.tagName.toLowerCase() + (btn.id ? `#${btn.id}` : ""),
          text: btn.textContent?.trim() || btn.value || "",
          visible: btn.offsetParent !== null,
        });
      }

      // 查找输入框
      const inputs = document.querySelectorAll(
        'input[type="text"], input[type="number"], textarea'
      );
      for (const input of inputs) {
        elements.inputs.push({
          selector:
            input.tagName.toLowerCase() + (input.id ? `#${input.id}` : ""),
          type: input.type || "text",
          visible: input.offsetParent !== null,
        });
      }

      // 查找其他交互元素
      const others = document.querySelectorAll(
        '[onclick], .clickable, [role="button"]'
      );
      for (const elem of others) {
        if (
          !elements.buttons.some((b) => b.selector.includes(elem.id)) &&
          !elements.inputs.some((i) => i.selector.includes(elem.id))
        ) {
          elements.others.push({
            selector:
              elem.tagName.toLowerCase() + (elem.id ? `#${elem.id}` : ""),
            text: elem.textContent?.trim().substring(0, 20) || "",
            visible: elem.offsetParent !== null,
          });
        }
      }

      return elements;
    });
  } catch (error) {
    return { buttons: [], inputs: [], others: [] };
  }
}

// 快速交互测试
async function quickInteractionTest(page) {
  let screenshots = 0;
  let interactions = 0;

  try {
    // 查找并点击最多3个按钮
    const buttons = await page.locator('button, input[type="button"]').all();
    for (let i = 0; i < Math.min(buttons.length, 3); i++) {
      try {
        await buttons[i].click({ timeout: 2000 });
        interactions++;
        await page.waitForTimeout(500);

        await safeScreenshot(page, `quick_interaction_${i}.png`);
        screenshots++;
      } catch (e) {
        // 忽略单个交互失败
      }
    }

    // 测试输入框
    const inputs = await page
      .locator('input[type="text"], input[type="number"]')
      .all();
    for (let i = 0; i < Math.min(inputs.length, 2); i++) {
      try {
        await inputs[i].fill("test");
        interactions++;
        await page.waitForTimeout(300);

        await safeScreenshot(page, `quick_input_${i}.png`);
        screenshots++;
      } catch (e) {
        // 忽略单个交互失败
      }
    }
  } catch (error) {
    // 忽略整体错误，返回已完成的交互
  }

  return { interactions, screenshots };
}

// 详细交互测试
async function detailedInteractionTest(page, elements, fsmConfig) {
  let screenshots = 0;
  let successful_interactions = 0;
  let total_interactions = 0;

  const testData = ["1", "5", "test", ""];

  // 测试所有按钮
  for (const button of elements.buttons) {
    if (!button.visible) continue;

    total_interactions++;
    try {
      if (button.selector.includes("#")) {
        await page.click(button.selector);
      } else {
        await page.locator(button.selector).first().click();
      }

      successful_interactions++;
      await page.waitForTimeout(500);

      await safeScreenshot(page, `button_${total_interactions}.png`);
      screenshots++;
    } catch (error) {
      console.log(`⚠️ 按钮交互失败: ${button.selector}`);
    }
  }

  // 测试所有输入框
  for (const input of elements.inputs) {
    if (!input.visible) continue;

    for (const data of testData.slice(0, 2)) {
      // 限制测试数据
      total_interactions++;
      try {
        if (input.selector.includes("#")) {
          await page.fill(input.selector, data);
        } else {
          await page.locator(input.selector).first().fill(data);
        }

        successful_interactions++;
        await page.waitForTimeout(300);

        await safeScreenshot(page, `input_${total_interactions}.png`);
        screenshots++;
      } catch (error) {
        console.log(`⚠️ 输入交互失败: ${input.selector}`);
      }
    }
  }

  return {
    total_interactions,
    successful_interactions,
    screenshots,
  };
}
