// universal-fsm-extractor-debug.mjs
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 简化的行为探针配置
const BEHAVIOR_PROBES = {
  input: {
    detect: async (page) => {
      const inputs = await page.$$("input, textarea");
      const inputData = [];

      for (let i = 0; i < inputs.length; i++) {
        const input = inputs[i];
        try {
          const placeholder = (await input.getAttribute("placeholder")) || "";
          const type = (await input.getAttribute("type")) || "text";
          const id = (await input.getAttribute("id")) || `input_${i}`;

          inputData.push({
            element: input,
            type: "input",
            id: id,
            placeholder: placeholder,
            inputType: type,
          });
        } catch (e) {
          console.log(`Input ${i} detection failed:`, e.message);
        }
      }
      return inputData;
    },
  },

  button: {
    detect: async (page) => {
      // 首先查找所有可能的按钮
      const selectors = [
        "button",
        'input[type="button"]',
        'input[type="submit"]',
        '[role="button"]',
        ".btn",
        "[onclick]",
      ];

      let allButtons = [];
      for (const selector of selectors) {
        try {
          const elements = await page.$$(selector);
          allButtons = [...allButtons, ...elements];
        } catch (e) {
          console.log(`Selector ${selector} failed:`, e.message);
        }
      }

      // 去重
      const uniqueButtons = [];
      const seen = new Set();

      for (const btn of allButtons) {
        try {
          const handle = await btn.evaluateHandle((el) => el);
          if (!seen.has(handle)) {
            seen.add(handle);
            uniqueButtons.push(btn);
          }
        } catch (e) {
          // 忽略错误，继续处理下一个
        }
      }

      const buttonData = [];
      for (let i = 0; i < uniqueButtons.length; i++) {
        const btn = uniqueButtons[i];
        try {
          const text = ((await btn.textContent()) || "")
            .trim()
            .substring(0, 50);
          const id = (await btn.getAttribute("id")) || `button_${i}`;
          const isVisible = await btn.isVisible();

          buttonData.push({
            element: btn,
            type: "button",
            id: id,
            text: text || "unnamed_button",
            visible: isVisible,
            index: i,
          });
        } catch (e) {
          console.log(`Button ${i} processing failed:`, e.message);
        }
      }

      return buttonData;
    },
  },
};

// 简化的页面状态捕获
async function capturePageState(page) {
  try {
    const state = {
      timestamp: Date.now(),

      // 基本元素计数
      elementCounts: await page.evaluate(() => ({
        buttons: document.querySelectorAll("button").length,
        inputs: document.querySelectorAll("input, textarea").length,
        totalElements: document.querySelectorAll("*").length,
      })),

      // 树节点检测
      treeNodes: await page.evaluate(() => {
        const nodes = document.querySelectorAll(
          '.node, circle, rect, [class*="node"]'
        );
        return Array.from(nodes).map((el) => ({
          text: el.textContent ? el.textContent.trim() : "",
          tagName: el.tagName,
          className: el.className || "",
        }));
      }),

      // 可见文本（简化）
      visibleText: await page.evaluate(() => {
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
          null,
          false
        );
        const texts = [];
        let node;
        while ((node = walker.nextNode())) {
          if (node.textContent.trim().length > 0) {
            texts.push(node.textContent.trim());
          }
        }
        return texts.slice(0, 20);
      }),
    };

    return state;
  } catch (e) {
    console.log("State capture failed:", e.message);
    return { error: e.message };
  }
}

// 简化的状态变化检测
function detectStateChanges(before, after) {
  const changes = {
    hasSignificantChange: false,
    details: [],
  };

  try {
    // 检查树节点变化
    if (before.treeNodes && after.treeNodes) {
      if (before.treeNodes.length !== after.treeNodes.length) {
        changes.hasSignificantChange = true;
        changes.details.push({
          type: "node_count_change",
          before: before.treeNodes.length,
          after: after.treeNodes.length,
        });
      }
    }

    // 检查元素数量变化
    if (before.elementCounts && after.elementCounts) {
      if (
        before.elementCounts.totalElements !== after.elementCounts.totalElements
      ) {
        changes.hasSignificantChange = true;
        changes.details.push({
          type: "element_count_change",
          before: before.elementCounts.totalElements,
          after: after.elementCounts.totalElements,
        });
      }
    }

    // 检查文本内容变化
    if (before.visibleText && after.visibleText) {
      const newText = after.visibleText.filter(
        (text) => !before.visibleText.includes(text)
      );
      if (newText.length > 0) {
        changes.hasSignificantChange = true;
        changes.details.push({
          type: "text_content_change",
          newText: newText,
        });
      }
    }

    return changes;
  } catch (e) {
    console.log("State change detection failed:", e.message);
    return {
      hasSignificantChange: false,
      details: [],
      error: e.message,
    };
  }
}

// 简化的语义推断
function inferInteractionSemantic(button, changes) {
  const text = button.text.toLowerCase();

  // 基于按钮文本的简单推断
  if (text.includes("insert") || text.includes("add")) return "insert";
  if (text.includes("delete") || text.includes("remove")) return "delete";
  if (text.includes("search") || text.includes("find")) return "search";

  // 基于行为变化的推断
  if (changes.details && Array.isArray(changes.details)) {
    const nodeChange = changes.details.find(
      (d) => d.type === "node_count_change"
    );
    if (nodeChange) {
      if (nodeChange.after > nodeChange.before) return "insert";
      if (nodeChange.after < nodeChange.before) return "delete";
    }
  }

  return "unknown";
}

// 主FSM提取函数
async function extractFSMFromPage(htmlFilePath) {
  console.log("Starting browser...");
  const browser = await chromium.launch({
    headless: false,
    slowMo: 100, // 减慢操作以便观察
  });
  const page = await browser.newPage();

  // 设置超时
  page.setDefaultTimeout(10000);
  page.setDefaultNavigationTimeout(15000);

  const fsm = {
    states: [],
    transitions: [],
    components: {},
    issues: [],
    debug: {},
  };

  try {
    // 转换文件路径
    const fileUrl = `file:///${htmlFilePath.replace(/\\/g, "/")}`;
    console.log(`Loading URL: ${fileUrl}`);

    await page.goto(fileUrl, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    console.log("Page loaded, capturing initial state...");

    // 初始状态
    const initialState = await capturePageState(page);
    fsm.states.push({
      id: "initial",
      type: "initial",
      description: "Page loaded",
    });

    fsm.debug.initialState = initialState;

    // 探测组件
    console.log("Detecting components...");
    const inputs = await BEHAVIOR_PROBES.input.detect(page);
    const buttons = await BEHAVIOR_PROBES.button.detect(page);

    console.log(`Found ${inputs.length} inputs, ${buttons.length} buttons`);

    fsm.components = {
      inputs: inputs.length,
      buttons: buttons.length,
      inputDetails: inputs.map((i) => ({ id: i.id, type: i.inputType })),
      buttonDetails: buttons.map((b) => ({ id: b.id, text: b.text })),
    };

    fsm.debug.detectedButtons = buttons.map((b) => b.text);

    // 测试每个按钮
    for (const button of buttons) {
      if (!button.visible) {
        console.log(`Skipping invisible button: ${button.text}`);
        continue;
      }

      console.log(`\n=== Testing button: "${button.text}" (${button.id}) ===`);

      try {
        // 如果有输入框，先填充测试数据
        if (inputs.length > 0) {
          console.log("Filling input with test data...");
          await inputs[0].element.fill("50");
          await page.waitForTimeout(500);
        }

        // 捕获点击前状态
        const beforeState = await capturePageState(page);
        console.log(
          `Before click: ${beforeState.treeNodes?.length || 0} tree nodes`
        );

        // 点击按钮
        console.log("Clicking button...");
        await button.element.click();
        await page.waitForTimeout(2000);

        // 捕获点击后状态
        const afterState = await capturePageState(page);
        console.log(
          `After click: ${afterState.treeNodes?.length || 0} tree nodes`
        );

        // 检测变化
        const changes = detectStateChanges(beforeState, afterState);
        console.log("Changes detected:", changes);

        if (changes.hasSignificantChange) {
          const semantic = inferInteractionSemantic(button, changes);

          // 创建新状态
          const newStateId = `state_after_${button.id}`;
          fsm.states.push({
            id: newStateId,
            type: "interaction",
            description: `After clicking ${button.text}`,
            semantic: semantic,
          });

          // 创建转换
          fsm.transitions.push({
            from: "initial",
            to: newStateId,
            event: `click_${button.id}`,
            element: button.text,
            semantic: semantic,
            changes: changes.details,
          });

          console.log(`✅ Added transition: ${button.text} -> ${semantic}`);
        } else {
          console.log(`❌ No significant changes detected for ${button.text}`);
          fsm.issues.push(
            `Button "${button.text}" produced no detectable changes`
          );
        }
      } catch (error) {
        console.log(`❌ Button test failed:`, error.message);
        fsm.issues.push(`Button "${button.text}" failed: ${error.message}`);
      }

      // 重新加载页面进行下一个测试
      console.log("Reloading page for next test...");
      await page.reload();
      await page.waitForTimeout(2000);
    }

    // 如果没有找到任何状态，至少保留初始状态
    if (fsm.states.length === 1) {
      fsm.issues.push("No interactive transitions detected");
    }
  } catch (error) {
    console.error("❌ FSM extraction failed:", error);
    fsm.issues.push(`Extraction failed: ${error.message}`);
  } finally {
    await browser.close();
  }

  return fsm;
}

// 主函数
async function main() {
  const htmlFilePath = process.argv[2];

  if (!htmlFilePath) {
    console.log(
      "Usage: node universal-fsm-extractor-debug.mjs <path-to-html-file>"
    );
    process.exit(1);
  }

  if (!fs.existsSync(htmlFilePath)) {
    console.error(`File not found: ${htmlFilePath}`);
    process.exit(1);
  }

  console.log("🚀 Starting FSM extraction with debug mode...");
  console.log(`Target: ${htmlFilePath}`);

  const fsm = await extractFSMFromPage(htmlFilePath);

  // 保存结果
  const outputFile = path.join(__dirname, "extracted-fsm-debug.json");
  fs.writeFileSync(outputFile, JSON.stringify(fsm, null, 2));

  console.log("\n📊 === EXTRACTION RESULTS ===");
  console.log(`States: ${fsm.states.length}`);
  console.log(`Transitions: ${fsm.transitions.length}`);
  console.log(`Components: ${JSON.stringify(fsm.components)}`);
  console.log(`Issues: ${fsm.issues.length}`);

  if (fsm.issues.length > 0) {
    console.log("\n⚠️ Issues:");
    fsm.issues.forEach((issue) => console.log(`  - ${issue}`));
  }

  if (fsm.transitions.length > 0) {
    console.log("\n🔄 Transitions found:");
    fsm.transitions.forEach((t) =>
      console.log(`  ${t.from} -> ${t.to} (${t.semantic})`)
    );
  }

  console.log(`\n💾 Results saved to: ${outputFile}`);
}

// 运行主函数
const isMainModule =
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMainModule) {
  main().catch(console.error);
}
