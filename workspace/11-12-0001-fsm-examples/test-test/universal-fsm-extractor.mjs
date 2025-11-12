// universal-fsm-extractor.mjs
import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 修复后的行为探针配置
const BEHAVIOR_PROBES = {
  // 输入相关探针
  input: {
    detect: async (page) => {
      const inputs = await page.$$('input, textarea, [contenteditable="true"]');
      const inputData = [];

      for (let i = 0; i < inputs.length; i++) {
        const input = inputs[i];
        const placeholder = (await input.getAttribute("placeholder")) || "";
        const valueType = (await input.getAttribute("type")) || "text";

        inputData.push({
          element: input,
          type: "input",
          id: `input_${i}`,
          placeholder: placeholder,
          valueType: valueType,
        });
      }
      return inputData;
    },
    test: async (page, element, value = "42") => {
      try {
        await element.fill("");
        await element.fill(value);
        return { success: true, value };
      } catch (e) {
        return { success: false, error: e.message };
      }
    },
  },

  // 按钮相关探针
  button: {
    detect: async (page) => {
      const buttons = await page.$$(
        'button, [role="button"], input[type="button"], input[type="submit"], .btn, [onclick]'
      );

      // 检测有指针光标的元素
      const allElements = await page.$$("div, span, a, p, li");
      const interactiveDivs = [];

      for (const el of allElements) {
        const cursor = await el.evaluate((e) => getComputedStyle(e).cursor);
        if (cursor === "pointer") {
          interactiveDivs.push(el);
        }
      }

      const allButtons = [...buttons, ...interactiveDivs];
      const buttonData = [];

      for (let i = 0; i < allButtons.length; i++) {
        const btn = allButtons[i];
        const text = ((await btn.textContent()) || "").trim();
        const id = (await btn.getAttribute("id")) || `button_${i}`;
        const visible = await btn.isVisible();

        buttonData.push({
          element: btn,
          type: "button",
          id: id,
          text: text,
          visible: visible,
        });
      }

      return buttonData;
    },
    test: async (page, element, context = {}) => {
      const beforeState = await capturePageState(page);

      try {
        await element.click({ force: true });
        await page.waitForTimeout(800);

        const afterState = await capturePageState(page);
        const changes = detectStateChanges(beforeState, afterState);

        return {
          success: true,
          changes,
          stateChange: changes.hasSignificantChange,
          newState: afterState,
        };
      } catch (e) {
        return {
          success: false,
          error: e.message,
          changes: { hasSignificantChange: false },
        };
      }
    },
  },

  // 选择器相关探针
  selector: {
    detect: async (page) => {
      const selects = await page.$$('select, [role="listbox"]');
      const selectData = [];

      for (let i = 0; i < selects.length; i++) {
        const select = selects[i];
        const options = await select.$$eval("option", (opts) =>
          opts.map((o) => o.textContent)
        );

        selectData.push({
          element: select,
          type: "selector",
          id: `select_${i}`,
          options: options,
        });
      }
      return selectData;
    },
    test: async (page, element) => {
      const options = await element.$$("option");
      if (options.length > 1) {
        await element.selectOption({ index: 1 });
        await page.waitForTimeout(300);
        return { success: true, value: "option_1" };
      }
      return { success: false, error: "No options available" };
    },
  },
};

// 页面状态捕获
async function capturePageState(page) {
  const state = {
    timestamp: Date.now(),
    url: page.url(),

    // DOM 状态
    visibleText: await page.evaluate(() => {
      const elements = Array.from(document.body.getElementsByTagName("*"));
      return elements
        .filter((el) => el.children.length === 0 && el.textContent.trim())
        .map((el) => el.textContent.trim())
        .filter((text) => text.length > 0)
        .slice(0, 50);
    }),

    // 类名和属性变化
    classes: await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll("*"));
      const allClasses = elements.map((el) => Array.from(el.classList)).flat();
      return [...new Set(allClasses)].slice(0, 100);
    }),

    // 特定元素状态
    inputs: await page.$$eval("input, textarea", (elements) =>
      elements.map((el) => ({
        value: el.value,
        type: el.type,
        id: el.id,
        placeholder: el.placeholder,
      }))
    ),

    // 可视化状态
    visibleElements: await page.evaluate(() => ({
      buttons: document.querySelectorAll('button, [role="button"]').length,
      inputs: document.querySelectorAll("input, textarea").length,
      images: document.querySelectorAll("img").length,
      visibleNodes: document.querySelectorAll("*").length,
    })),

    // 错误状态
    errors: await page.evaluate(() => {
      const errorElements = document.querySelectorAll(
        '[class*="error"], [class*="invalid"]'
      );
      return Array.from(errorElements).map((el) => el.textContent.trim());
    }),

    // 自定义应用状态
    customState: await detectCustomAppState(page),
  };

  return state;
}

// 检测特定应用状态
async function detectCustomAppState(page) {
  try {
    // 尝试检测树结构
    const treeNodes = await page.$$eval(
      '.node, [class*="node"], circle, rect',
      (elements) =>
        elements.map((el) => ({
          text: el.textContent ? el.textContent.trim() : "",
          transform: el.getAttribute("transform"),
          class: el.className?.baseVal || el.className,
        }))
    );

    // 检测高亮状态
    const highlighted = await page.$$eval(
      '.highlight, [class*="highlight"], [style*="background"]',
      (elements) => elements.length
    );

    return {
      hasTreeStructure: treeNodes.length > 0,
      nodeCount: treeNodes.length,
      highlightedCount: highlighted,
      treeNodes: treeNodes.slice(0, 10),
    };
  } catch (e) {
    return { error: e.message };
  }
}

// 检测状态变化
function detectStateChanges(before, after) {
  const changes = {
    hasSignificantChange: false,
    details: [],
  };

  // 文本内容变化
  const newText = after.visibleText.filter(
    (text) => !before.visibleText.includes(text)
  );
  const removedText = before.visibleText.filter(
    (text) => !after.visibleText.includes(text)
  );

  if (newText.length > 0 || removedText.length > 0) {
    changes.hasSignificantChange = true;
    changes.details.push({
      type: "text_change",
      added: newText,
      removed: removedText,
    });
  }

  // 类名变化
  const newClasses = after.classes.filter(
    (cls) => !before.classes.includes(cls)
  );
  const removedClasses = before.classes.filter(
    (cls) => !after.classes.includes(cls)
  );

  if (newClasses.length > 0 || removedClasses.length > 0) {
    changes.hasSignificantChange = true;
    changes.details.push({
      type: "class_change",
      added: newClasses,
      removed: removedClasses,
    });
  }

  // 树结构变化
  if (before.customState.nodeCount !== after.customState.nodeCount) {
    changes.hasSignificantChange = true;
    changes.details.push({
      type: "tree_structure_change",
      before: before.customState.nodeCount,
      after: after.customState.nodeCount,
    });
  }

  return changes;
}

// 推断交互语义
function inferInteractionSemantic(element, stateChanges, context) {
  const text = element.text ? element.text.toLowerCase() : "";
  const changes = stateChanges.changes || [];

  // 基于文本的推断
  if (text.includes("insert") || text.includes("add") || text.includes("+")) {
    const hasNewNodes = changes.some(
      (change) =>
        change.type === "tree_structure_change" && change.after > change.before
    );
    if (hasNewNodes) return "insert";
  }

  if (
    text.includes("delete") ||
    text.includes("remove") ||
    text.includes("-")
  ) {
    const hasRemovedNodes = changes.some(
      (change) =>
        change.type === "tree_structure_change" && change.after < change.before
    );
    if (hasRemovedNodes) return "delete";
  }

  if (text.includes("search") || text.includes("find")) {
    return "search";
  }

  // 基于行为模式的推断
  if (
    changes.some(
      (c) => c.type === "tree_structure_change" && c.after > c.before
    )
  ) {
    return "insert";
  }

  if (
    changes.some(
      (c) => c.type === "tree_structure_change" && c.after < c.before
    )
  ) {
    return "delete";
  }

  return "unknown";
}

// 主FSM提取函数
async function extractFSMFromPage(htmlFilePath) {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // 转换文件路径
    const fileUrl = `file:///${htmlFilePath.replace(/\\/g, "/")}`;
    console.log(`Loading: ${fileUrl}`);

    await page.goto(fileUrl);
    await page.waitForTimeout(2000);

    const fsm = {
      states: [],
      transitions: [],
      components: {},
      initialState: "start",
      issues: [],
    };

    // 初始状态
    const initialState = await capturePageState(page);
    fsm.states.push({
      id: "start",
      type: "initial",
      description: "Initial page load",
      stateSnapshot: initialState,
    });

    // 探测所有交互组件
    const components = {
      inputs: await BEHAVIOR_PROBES.input.detect(page),
      buttons: await BEHAVIOR_PROBES.button.detect(page),
      selectors: await BEHAVIOR_PROBES.selector.detect(page),
    };

    fsm.components = {
      inputCount: components.inputs.length,
      buttonCount: components.buttons.length,
      selectorCount: components.selectors.length,
    };

    console.log(
      `Detected ${components.inputs.length} inputs, ${components.buttons.length} buttons, ${components.selectors.length} selectors`
    );

    // 测试每个按钮
    let stateCounter = 1;

    for (const button of components.buttons) {
      if (!button.visible) continue;

      console.log(`Testing button: ${button.text} (${button.id})`);

      // 准备输入（如果有）
      if (components.inputs.length > 0) {
        const inputTest = await BEHAVIOR_PROBES.input.test(
          page,
          components.inputs[0].element
        );
        if (!inputTest.success) {
          fsm.issues.push(`Input field not functional: ${inputTest.error}`);
        }
      }

      // 测试按钮点击
      const buttonTest = await BEHAVIOR_PROBES.button.test(
        page,
        button.element
      );

      if (buttonTest.success && buttonTest.stateChange) {
        // 创建新状态
        const newStateId = `state_${stateCounter++}`;
        const semantic = inferInteractionSemantic(
          button,
          buttonTest,
          components
        );

        fsm.states.push({
          id: newStateId,
          type: "interaction",
          description: `After clicking ${button.text}`,
          semantic: semantic,
          stateSnapshot: buttonTest.newState,
        });

        // 创建转换
        fsm.transitions.push({
          from: "start",
          to: newStateId,
          event: `click_${button.id}`,
          element: button.text,
          semantic: semantic,
          confidence: 0.8,
          changes: buttonTest.changes.details,
        });
      } else if (!buttonTest.success) {
        fsm.issues.push(`Button ${button.text} failed: ${buttonTest.error}`);
      }

      // 重新加载页面进行下一个测试
      await page.reload();
      await page.waitForTimeout(1000);
    }

    return fsm;
  } catch (error) {
    console.error("Error extracting FSM:", error);
    return {
      states: [],
      transitions: [],
      components: {},
      issues: [`Extraction failed: ${error.message}`],
    };
  } finally {
    await browser.close();
  }
}

// 使用示例
async function main() {
  const htmlFilePath = process.argv[2];

  if (!htmlFilePath) {
    console.log("Usage: node universal-fsm-extractor.mjs <path-to-html-file>");
    process.exit(1);
  }

  if (!fs.existsSync(htmlFilePath)) {
    console.error(`File not found: ${htmlFilePath}`);
    process.exit(1);
  }

  console.log(`Extracting FSM from: ${htmlFilePath}`);

  const fsm = await extractFSMFromPage(htmlFilePath);

  // 保存结果
  const outputFile = path.join(__dirname, "extracted-fsm.json");
  fs.writeFileSync(outputFile, JSON.stringify(fsm, null, 2));

  console.log(`\nFSM extracted successfully!`);
  console.log(`- States: ${fsm.states.length}`);
  console.log(`- Transitions: ${fsm.transitions.length}`);
  console.log(`- Components: ${JSON.stringify(fsm.components)}`);
  console.log(`- Issues: ${fsm.issues.length}`);
  console.log(`Results saved to: ${outputFile}`);
}

// 运行主函数
const isMainModule =
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMainModule) {
  main().catch(console.error);
}

export { extractFSMFromPage };
