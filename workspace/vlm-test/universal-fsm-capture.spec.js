import { test } from "@playwright/test";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HTML_FOLDER = path.join(__dirname, "html");
const VISUALS_FOLDER = path.join(__dirname, "visuals");

// 通用交互元素映射配置
const UNIVERSAL_INTERACTION_MAP = {
  // 按钮相关的事件
  button_events: {
    CLICK_INSERT: ["Insert", "Add", "Push", "Enqueue", "插入", "添加"],
    CLICK_DELETE: ["Delete", "Remove", "Pop", "Dequeue", "删除", "移除"],
    CLICK_RESET: ["Reset", "Clear", "Empty", "重置", "清空"],
    CLICK_SEARCH: ["Search", "Find", "Lookup", "搜索", "查找"],
    CLICK_UPDATE: ["Update", "Modify", "Edit", "更新", "修改"],
    CLICK_SUBMIT: ["Submit", "Apply", "Confirm", "提交", "确认"],
    CLICK_START: ["Start", "Begin", "Play", "开始", "播放"],
    CLICK_STOP: ["Stop", "Pause", "End", "停止", "暂停"],
    CLICK_NEXT: ["Next", "Forward", "下一个", "前进"],
    CLICK_PREV: ["Previous", "Back", "上一个", "返回"],
    CLICK_SORT: ["Sort", "Order", "排序"],
    CLICK_SHUFFLE: ["Shuffle", "Random", "随机", "打乱"],
  },

  // 输入相关的事件
  input_events: {
    INPUT_VALID: ["valid", "correct", "success"],
    INPUT_INVALID: ["invalid", "error", "fail"],
    INPUT_EMPTY: ["empty", "blank"],
    INPUT_CHANGE: ["change", "update", "modify"],
  },

  // 常见的输入元素选择器
  input_selectors: [
    'input[type="text"]',
    'input[type="number"]',
    'input[type="email"]',
    'input[type="password"]',
    "textarea",
    "select",
    'input:not([type="button"]):not([type="submit"]):not([type="reset"])',
  ],

  // 常见的按钮选择器
  button_selectors: [
    "button",
    'input[type="button"]',
    'input[type="submit"]',
    'input[type="reset"]',
    '[role="button"]',
    ".btn",
    ".button",
  ],

  // 测试数据生成器
  test_data: {
    numbers: [1, 5, 10, 15, 20, 25, 30, 42, 99, 100],
    strings: ["test", "hello", "world", "data", "item", "value"],
    invalid_inputs: ["", "abc", "!@#", "null", "undefined"],
    edge_cases: [0, -1, 999999, "0", " ", "\n"],
  },
};

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
    const fsmScript =
      document.getElementById("fsm") ||
      document.querySelector('script[type="application/json"]');
    if (!fsmScript) return null;
    try {
      return JSON.parse(fsmScript.textContent);
    } catch (error) {
      console.error("Failed to parse FSM JSON:", error);
      return null;
    }
  });
}

// 自动发现页面上的交互元素
async function discoverInteractiveElements(page) {
  return await page.evaluate((selectors) => {
    const elements = {
      buttons: [],
      inputs: [],
      interactive: [],
    };

    // 查找所有按钮
    selectors.button_selectors.forEach((selector) => {
      try {
        const buttons = document.querySelectorAll(selector);
        buttons.forEach((btn) => {
          if (btn.offsetParent !== null) {
            // 确保元素可见
            elements.buttons.push({
              selector: selector,
              text:
                btn.textContent?.trim() ||
                btn.value ||
                btn.getAttribute("aria-label") ||
                "",
              id: btn.id || "",
              className: btn.className || "",
              type: btn.type || "",
              tagName: btn.tagName,
            });
          }
        });
      } catch (e) {
        console.warn(`Error with selector ${selector}:`, e);
      }
    });

    // 查找所有输入元素
    selectors.input_selectors.forEach((selector) => {
      try {
        const inputs = document.querySelectorAll(selector);
        inputs.forEach((input) => {
          if (input.offsetParent !== null) {
            // 确保元素可见
            elements.inputs.push({
              selector: selector,
              id: input.id || "",
              name: input.name || "",
              type: input.type || "",
              placeholder: input.placeholder || "",
              className: input.className || "",
              tagName: input.tagName,
            });
          }
        });
      } catch (e) {
        console.warn(`Error with selector ${selector}:`, e);
      }
    });

    // 查找其他可交互元素
    const interactiveSelectors = [
      "[onclick]",
      '[role="button"]',
      ".clickable",
      "[tabindex]",
    ];
    interactiveSelectors.forEach((selector) => {
      try {
        const elements_list = document.querySelectorAll(selector);
        elements_list.forEach((el) => {
          if (el.offsetParent !== null) {
            elements.interactive.push({
              selector: selector,
              text: el.textContent?.trim() || "",
              id: el.id || "",
              className: el.className || "",
              tagName: el.tagName,
            });
          }
        });
      } catch (e) {
        console.warn(`Error with selector ${selector}:`, e);
      }
    });

    return elements;
  }, UNIVERSAL_INTERACTION_MAP);
}

// 将FSM事件映射到页面元素
function mapFSMEventsToElements(fsmEvents, discoveredElements) {
  const mappings = [];

  fsmEvents.forEach((event) => {
    const eventName = event.toUpperCase();

    // 映射按钮事件
    Object.entries(UNIVERSAL_INTERACTION_MAP.button_events).forEach(
      ([pattern, keywords]) => {
        if (eventName.includes(pattern.replace("CLICK_", ""))) {
          discoveredElements.buttons.forEach((button) => {
            const buttonText = button.text.toLowerCase();
            if (
              keywords.some((keyword) =>
                buttonText.includes(keyword.toLowerCase())
              )
            ) {
              mappings.push({
                event: event,
                action: "click",
                element: button,
                selector: constructSelector(button),
                confidence: calculateConfidence(event, button.text, keywords),
              });
            }
          });
        }
      }
    );

    // 映射输入事件
    if (
      eventName.includes("INPUT") ||
      eventName.includes("ENTER") ||
      eventName.includes("TYPE")
    ) {
      discoveredElements.inputs.forEach((input) => {
        mappings.push({
          event: event,
          action: "input",
          element: input,
          selector: constructSelector(input),
          confidence: 0.7,
        });
      });
    }
  });

  return mappings.sort((a, b) => b.confidence - a.confidence);
}

// 构建CSS选择器
function constructSelector(element) {
  if (element.id) {
    return `#${element.id}`;
  }

  let selector = element.tagName.toLowerCase();

  if (element.type) {
    selector += `[type="${element.type}"]`;
  }

  if (element.text && element.tagName === "BUTTON") {
    // 使用text content作为选择器
    return `button:has-text("${element.text}")`;
  }

  if (element.className) {
    const classes = element.className.split(" ").filter((c) => c.trim());
    if (classes.length > 0) {
      selector += "." + classes[0];
    }
  }

  return selector;
}

// 计算映射置信度
function calculateConfidence(event, elementText, keywords) {
  let confidence = 0.5;

  const eventLower = event.toLowerCase();
  const textLower = elementText.toLowerCase();

  // 精确匹配
  if (keywords.some((keyword) => textLower === keyword.toLowerCase())) {
    confidence = 0.95;
  }
  // 包含匹配
  else if (
    keywords.some((keyword) => textLower.includes(keyword.toLowerCase()))
  ) {
    confidence = 0.8;
  }
  // 事件名匹配
  else if (
    textLower.includes(eventLower.replace("click_", "").replace("_", ""))
  ) {
    confidence = 0.7;
  }

  return confidence;
}

// 等待页面稳定
async function waitForPageStable(page, timeout = 1000) {
  await page.waitForTimeout(timeout);
}

// 捕获状态截图
async function captureStateScreenshot(
  page,
  stateName,
  screenshotFolder,
  stateIndex,
  description = ""
) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = description
    ? `${stateIndex
        .toString()
        .padStart(2, "0")}_${stateName}_${description}.png`
    : `${stateIndex.toString().padStart(2, "0")}_${stateName}.png`;

  const screenshotPath = path.join(screenshotFolder, filename);

  try {
    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
      type: "png",
      timeout: 10000,
    });
    console.log(`  📸 截图: ${filename}`);
    return screenshotPath;
  } catch (error) {
    console.error(`  ❌ 截图失败: ${filename}`, error.message);
    return null;
  }
}

// 执行通用交互测试
async function executeUniversalInteraction(page, mapping, testValue = null) {
  try {
    const { action, selector, element } = mapping;

    console.log(`    🎯 执行 ${action} 操作: ${selector}`);

    switch (action) {
      case "click":
        await page.click(selector, { timeout: 5000 });
        break;

      case "input":
        if (testValue !== null) {
          await page.fill(selector, testValue.toString(), { timeout: 5000 });
        }
        break;

      case "select":
        if (testValue !== null) {
          await page.selectOption(selector, testValue.toString(), {
            timeout: 5000,
          });
        }
        break;

      default:
        console.log(`    ⚠️ 未知操作类型: ${action}`);
    }

    await waitForPageStable(page, 500);
    return true;
  } catch (error) {
    console.error(`    ❌ 交互执行失败: ${error.message}`);
    return false;
  }
}

// 通用FSM状态模拟
async function simulateUniversalFSM(page, fsm, mappings, screenshotFolder) {
  let stateIndex = 0;
  const executedStates = new Set();

  console.log(`\n🎭 开始通用FSM状态模拟`);
  console.log(`📋 FSM信息: ${fsm.topic || "Unknown Topic"}`);
  console.log(`🔗 发现 ${mappings.length} 个事件映射`);

  // 设置通用alert处理器
  page.on("dialog", async (dialog) => {
    console.log(`    💬 Alert: ${dialog.message()}`);
    await waitForPageStable(page, 200);
    await captureStateScreenshot(
      page,
      "alert_active",
      screenshotFolder,
      ++stateIndex,
      "dialog"
    );
    await dialog.accept();
  });

  // 1. 捕获初始状态
  console.log(`\n📍 状态 ${++stateIndex}: 初始状态`);
  await captureStateScreenshot(page, "initial", screenshotFolder, stateIndex);

  // 2. 遍历所有发现的映射并执行测试
  for (const mapping of mappings) {
    if (mapping.confidence < 0.6) continue; // 跳过低置信度的映射

    const stateName = `${mapping.action}_${mapping.event}`.toLowerCase();

    // 避免重复执行相同的状态
    if (executedStates.has(stateName)) continue;
    executedStates.add(stateName);

    console.log(
      `\n📍 状态 ${++stateIndex}: ${
        mapping.event
      } (置信度: ${mapping.confidence.toFixed(2)})`
    );

    // 对于输入操作，测试多种数据类型
    if (mapping.action === "input") {
      const testDataSets = [
        { data: UNIVERSAL_INTERACTION_MAP.test_data.numbers, type: "numbers" },
        { data: UNIVERSAL_INTERACTION_MAP.test_data.strings, type: "strings" },
        {
          data: UNIVERSAL_INTERACTION_MAP.test_data.invalid_inputs,
          type: "invalid",
        },
      ];

      for (const testSet of testDataSets) {
        for (let i = 0; i < Math.min(3, testSet.data.length); i++) {
          const testValue = testSet.data[i];
          console.log(`    🧪 测试 ${testSet.type} 数据: ${testValue}`);

          const success = await executeUniversalInteraction(
            page,
            mapping,
            testValue
          );
          if (success) {
            await captureStateScreenshot(
              page,
              mapping.event.toLowerCase(),
              screenshotFolder,
              ++stateIndex,
              `${testSet.type}_${i}`
            );
          }
        }
      }
    } else {
      // 对于点击操作
      const success = await executeUniversalInteraction(page, mapping);
      if (success) {
        await captureStateScreenshot(
          page,
          mapping.event.toLowerCase(),
          screenshotFolder,
          stateIndex
        );
      }
    }

    await waitForPageStable(page, 800);
  }

  // 3. 尝试所有按钮的组合测试
  console.log(`\n🔄 执行组合操作测试...`);
  const buttonMappings = mappings.filter(
    (m) => m.action === "click" && m.confidence > 0.7
  );

  for (let i = 0; i < Math.min(5, buttonMappings.length); i++) {
    for (let j = i + 1; j < Math.min(5, buttonMappings.length); j++) {
      console.log(
        `\n📍 状态 ${++stateIndex}: 组合操作 ${buttonMappings[i].event} + ${
          buttonMappings[j].event
        }`
      );

      await executeUniversalInteraction(page, buttonMappings[i]);
      await waitForPageStable(page, 300);
      await executeUniversalInteraction(page, buttonMappings[j]);

      await captureStateScreenshot(
        page,
        "combination",
        screenshotFolder,
        stateIndex,
        `${buttonMappings[i].event}_${buttonMappings[j].event}`.toLowerCase()
      );
    }
  }

  // 4. 最终状态
  console.log(`\n📍 状态 ${++stateIndex}: 最终状态`);
  await captureStateScreenshot(page, "final", screenshotFolder, stateIndex);

  return stateIndex;
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

await ensureDirectory(VISUALS_FOLDER);

test.describe("通用FSM交互测试", () => {
  // 测试单个指定文件
  const TARGET_FILE = process.env.TARGET_HTML_FILE;
  if (TARGET_FILE) {
    test(`通用FSM测试: ${TARGET_FILE}`, async ({ page }) => {
      await runUniversalTest(page, TARGET_FILE);
    });
  } else {
    // 测试所有HTML文件
    test("发现并测试所有HTML文件", async ({ page }) => {
      const htmlFiles = await getHtmlFiles();
      console.log(`🔍 发现 ${htmlFiles.length} 个HTML文件`);

      for (const htmlFile of htmlFiles.slice(0, 3)) {
        // 限制测试前3个文件
        console.log(`\n🚀 开始测试: ${htmlFile}`);
        try {
          await runUniversalTest(page, htmlFile);
        } catch (error) {
          console.error(`❌ 测试 ${htmlFile} 失败:`, error.message);
        }
      }
    });
  }
});

// 通用测试执行函数
async function runUniversalTest(page, htmlFileName) {
  const fileBaseName = path.basename(htmlFileName, ".html");

  console.log(`\n🚀 开始通用FSM测试: ${htmlFileName}`);

  // 设置页面超时
  page.setDefaultTimeout(20000);
  page.setDefaultNavigationTimeout(20000);

  // 创建截图文件夹
  const screenshotFolder = path.join(VISUALS_FOLDER, fileBaseName);
  await ensureDirectory(screenshotFolder);

  // 导航到HTML文件
  const htmlUrl = getHtmlFilePath(htmlFileName);
  console.log(`🌐 导航到: ${htmlUrl}`);

  await page.goto(htmlUrl, {
    waitUntil: "domcontentloaded",
    timeout: 15000,
  });

  await waitForPageStable(page, 2000);

  // 提取FSM配置
  console.log(`📋 提取FSM配置...`);
  const fsm = await extractFSMFromPage(page);

  if (!fsm) {
    console.log(`⚠️ 未发现FSM配置，将执行基础交互发现测试`);
    fsm = {
      topic: "Auto-discovered interactions",
      states: [],
      events: ["AUTO_CLICK", "AUTO_INPUT", "AUTO_INTERACTION"],
    };
  } else {
    console.log(`✅ FSM配置发现:`);
    console.log(`   - 主题: ${fsm.topic}`);
    console.log(`   - 状态数: ${fsm.states?.length || 0}`);
    console.log(`   - 事件数: ${fsm.events?.length || 0}`);
  }

  // 发现页面交互元素
  console.log(`🔍 发现页面交互元素...`);
  const discoveredElements = await discoverInteractiveElements(page);

  console.log(`📊 发现的元素统计:`);
  console.log(`   - 按钮: ${discoveredElements.buttons.length}`);
  console.log(`   - 输入框: ${discoveredElements.inputs.length}`);
  console.log(`   - 其他交互元素: ${discoveredElements.interactive.length}`);

  // 映射FSM事件到页面元素
  console.log(`🔗 映射FSM事件到页面元素...`);
  const mappings = mapFSMEventsToElements(fsm.events || [], discoveredElements);

  if (mappings.length === 0) {
    console.log(`⚠️ 未发现任何事件映射，执行基础元素交互测试`);
    // 创建基础映射
    discoveredElements.buttons.forEach((btn, index) => {
      mappings.push({
        event: `AUTO_BUTTON_${index}`,
        action: "click",
        element: btn,
        selector: constructSelector(btn),
        confidence: 0.8,
      });
    });

    discoveredElements.inputs.forEach((input, index) => {
      mappings.push({
        event: `AUTO_INPUT_${index}`,
        action: "input",
        element: input,
        selector: constructSelector(input),
        confidence: 0.8,
      });
    });
  }

  console.log(`📈 生成 ${mappings.length} 个交互映射`);

  // 执行通用FSM状态模拟
  const totalScreenshots = await simulateUniversalFSM(
    page,
    fsm,
    mappings,
    screenshotFolder
  );

  // 生成测试报告
  const reportPath = path.join(screenshotFolder, "universal_test_report.json");
  const report = {
    timestamp: new Date().toISOString(),
    html_file: htmlFileName,
    fsm_config: fsm,
    discovered_elements: discoveredElements,
    event_mappings: mappings,
    total_screenshots: totalScreenshots,
    screenshot_folder: screenshotFolder,
  };

  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf-8");

  console.log(`\n🎉 通用FSM测试完成!`);
  console.log(`📊 总计截图: ${totalScreenshots} 张`);
  console.log(`📁 截图位置: ${screenshotFolder}`);
  console.log(`📋 报告文件: ${reportPath}`);
}

// 导出工具函数供其他测试使用
export {
  discoverInteractiveElements,
  mapFSMEventsToElements,
  simulateUniversalFSM,
  UNIVERSAL_INTERACTION_MAP,
};
