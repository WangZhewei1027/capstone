import { test } from "@playwright/test";
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HTML_FOLDER = path.join(__dirname, "html");
const VISUALS_FOLDER = path.join(__dirname, "visuals");
const FSM_OUTPUT_FOLDER = path.join(__dirname, "fsm");

// 批量处理配置
const BATCH_MODE =
  process.env.BATCH_MODE === "true" || process.env.BATCH_MODE === "1";
const TARGET_HTML_FILE =
  process.env.TARGET_HTML_FILE || "5d8dd330-bf50-11f0-9278-a57cfa0a44e5.html";

// 发现HTML文件夹中的所有HTML文件
async function discoverHtmlFiles() {
  try {
    const files = await fs.readdir(HTML_FOLDER);
    const htmlFiles = files.filter((file) => file.endsWith(".html"));
    console.log(`🔍 发现 ${htmlFiles.length} 个HTML文件:`, htmlFiles);
    return htmlFiles;
  } catch (error) {
    console.error(`❌ 无法读取HTML文件夹: ${error.message}`);
    return [];
  }
}

// 确保目录存在
async function ensureDirectory(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

// 获取HTML文件路径
function getHtmlFilePath(htmlFileName) {
  const htmlFilePath = path.join(HTML_FOLDER, htmlFileName);
  return `file:///${htmlFilePath.replace(/\\/g, "/")}`;
}

// 从页面中提取理想FSM配置
async function extractIdealFSMFromPage(page) {
  return await page.evaluate(() => {
    const fsmScript = document.getElementById("fsm");
    if (!fsmScript) return null;
    try {
      return JSON.parse(fsmScript.textContent);
    } catch (error) {
      console.error("Failed to parse FSM JSON:", error);
      return null;
    }
  });
}

// 等待页面稳定
async function waitForPageStable(page, timeout = 1000) {
  await page.waitForTimeout(timeout);
}

// ====== 新增：组件自动检测器 ======
class ComponentDetector {
  constructor(page) {
    this.page = page;
  }

  // 检测页面中的所有交互组件
  async detectComponents() {
    const components = await this.page.evaluate(() => {
      const detectedComponents = [];

      // 检测输入框
      const inputs = document.querySelectorAll("input, textarea, select");
      inputs.forEach((element, index) => {
        const id = element.id || `input_${index}`;
        detectedComponents.push({
          type: "input",
          id: id,
          selector: element.id
            ? `#${element.id}`
            : `input:nth-child(${index + 1})`,
          attributes: {
            type: element.type || "text",
            placeholder: element.placeholder || "",
            value: element.value || "",
            required: element.required,
          },
          position: element.getBoundingClientRect(),
        });
      });

      // 检测按钮
      const buttons = document.querySelectorAll(
        'button, input[type="button"], input[type="submit"], [role="button"]'
      );
      buttons.forEach((element, index) => {
        const id = element.id || `button_${index}`;
        const text = element.textContent || element.value || "";
        detectedComponents.push({
          type: "button",
          id: id,
          selector: element.id
            ? `#${element.id}`
            : `button:nth-child(${index + 1})`,
          text: text.trim(),
          attributes: {
            type: element.type || "button",
            disabled: element.disabled,
          },
          position: element.getBoundingClientRect(),
        });
      });

      // 检测画布和可视化容器
      const canvases = document.querySelectorAll(
        'canvas, svg, [id*="tree"], [id*="visual"], [class*="container"]'
      );
      canvases.forEach((element, index) => {
        const id = element.id || `canvas_${index}`;
        detectedComponents.push({
          type: "visual",
          id: id,
          selector: element.id
            ? `#${element.id}`
            : `${element.tagName.toLowerCase()}:nth-child(${index + 1})`,
          tagName: element.tagName.toLowerCase(),
          position: element.getBoundingClientRect(),
        });
      });

      return detectedComponents;
    });

    console.log(`🔍 检测到 ${components.length} 个组件:`);
    components.forEach((comp) => {
      console.log(
        `  - ${comp.type}: ${comp.id} (${comp.text || comp.tagName || "N/A"})`
      );
    });

    return components;
  }
}

// ====== 新增：行为探测器 ======
class BehaviorProber {
  constructor(page) {
    this.page = page;
    this.stateCaptures = [];
    this.currentStateId = 0;
  }

  // 捕获页面状态快照
  async capturePageState(stateName = null) {
    try {
      // 检查页面是否仍然可用
      if (this.page.isClosed()) {
        throw new Error("Page has been closed");
      }

      const state = await this.page.evaluate(() => {
        return {
          url: window.location.href,
          title: document.title,

          // DOM结构指纹
          elementCounts: {
            total: document.querySelectorAll("*").length,
            visible: Array.from(document.querySelectorAll("*")).filter(
              (el) => el.offsetWidth > 0 && el.offsetHeight > 0
            ).length,
            buttons: document.querySelectorAll('button, [role="button"]')
              .length,
            inputs: document.querySelectorAll("input, textarea").length,
            nodes: document.querySelectorAll(
              '.node, circle, rect, [class*="node"]'
            ).length,
          },

          // 可视元素状态
          visualElements: Array.from(
            document.querySelectorAll('.node, circle, rect, [class*="node"]')
          ).map((el) => ({
            tagName: el.tagName,
            className: el.className,
            textContent: el.textContent?.trim() || "",
            position: el.getBoundingClientRect(),
            visible: el.offsetWidth > 0 && el.offsetHeight > 0,
          })),

          // 表单状态
          formElements: Array.from(
            document.querySelectorAll("input, textarea, select")
          ).map((el) => ({
            id: el.id,
            type: el.type,
            value: el.value,
            disabled: el.disabled,
            focused: document.activeElement === el,
          })),

          // 按钮状态
          buttonElements: Array.from(
            document.querySelectorAll('button, [role="button"]')
          ).map((el) => ({
            id: el.id,
            text: el.textContent?.trim(),
            disabled: el.disabled,
            visible: el.offsetWidth > 0 && el.offsetHeight > 0,
          })),

          // 文本内容快照
          textContent: Array.from(document.querySelectorAll("body *"))
            .map((el) => el.textContent?.trim())
            .filter((text) => text && text.length > 0)
            .slice(0, 50), // 限制数量避免过大
        };
      });

      const stateId = `S${this.currentStateId++}_${stateName || "Unknown"}`;
      const stateCapture = {
        id: stateId,
        timestamp: Date.now(),
        name: stateName,
        ...state,
      };

      this.stateCaptures.push(stateCapture);
      return stateCapture;
    } catch (error) {
      console.error(`❌ 捕获页面状态失败 (${stateName}): ${error.message}`);
      // 返回一个基本的状态对象
      const fallbackState = {
        id: `S${this.currentStateId++}_${stateName || "Unknown"}_ERROR`,
        timestamp: Date.now(),
        name: stateName,
        error: error.message,
        elementCounts: {
          total: 0,
          visible: 0,
          buttons: 0,
          inputs: 0,
          nodes: 0,
        },
        visualElements: [],
        formElements: [],
        buttonElements: [],
        textContent: [],
      };
      this.stateCaptures.push(fallbackState);
      return fallbackState;
    }
  }

  // 检测两个状态之间的差异
  detectStateChanges(beforeState, afterState) {
    const changes = {
      hasSignificantChange: false,
      changeTypes: [],
      details: {},
    };

    // 检查元素数量变化
    if (beforeState.elementCounts && afterState.elementCounts) {
      Object.keys(beforeState.elementCounts).forEach((key) => {
        const before = beforeState.elementCounts[key];
        const after = afterState.elementCounts[key];
        if (before !== after) {
          changes.hasSignificantChange = true;
          changes.changeTypes.push("element_count_change");
          changes.details[key] = { before, after, diff: after - before };
        }
      });
    }

    // 检查可视元素变化
    const beforeNodes = beforeState.visualElements || [];
    const afterNodes = afterState.visualElements || [];
    if (beforeNodes.length !== afterNodes.length) {
      changes.hasSignificantChange = true;
      changes.changeTypes.push("visual_structure_change");
      changes.details.visualElements = {
        before: beforeNodes.length,
        after: afterNodes.length,
        diff: afterNodes.length - beforeNodes.length,
      };
    }

    // 检查表单状态变化
    const beforeForms = beforeState.formElements || [];
    const afterForms = afterState.formElements || [];
    const formChanges = [];
    beforeForms.forEach((beforeForm, index) => {
      const afterForm = afterForms[index];
      if (afterForm && beforeForm.value !== afterForm.value) {
        formChanges.push({
          id: beforeForm.id,
          before: beforeForm.value,
          after: afterForm.value,
        });
      }
    });

    if (formChanges.length > 0) {
      changes.hasSignificantChange = true;
      changes.changeTypes.push("form_value_change");
      changes.details.formChanges = formChanges;
    }

    return changes;
  }

  // 对单个组件进行行为探测
  async probeComponent(component, screenshotFolder, testValues = []) {
    console.log(`🧪 探测组件: ${component.type} - ${component.id}`);

    const probeResults = [];

    try {
      // 检查页面状态
      if (this.page.isClosed()) {
        throw new Error("Page has been closed before probing");
      }

      // 确保组件仍然存在
      const componentExists = await this.page
        .$(component.selector)
        .catch(() => null);
      if (!componentExists) {
        console.log(`  ⚠️ 组件不存在: ${component.selector}`);
        return probeResults;
      }

      if (component.type === "button") {
        // 捕获点击前状态
        const beforeState = await this.capturePageState(
          `before_click_${component.id}`
        );

        // 截图：点击前
        await this.page.screenshot({
          path: path.join(
            screenshotFolder,
            `${beforeState.id}_before_click.png`
          ),
          fullPage: true,
        });

        try {
          // 执行点击
          await this.page.click(component.selector);
          await waitForPageStable(this.page, 500);

          // 捕获点击后状态
          const afterState = await this.capturePageState(
            `after_click_${component.id}`
          );

          // 截图：点击后
          await this.page.screenshot({
            path: path.join(
              screenshotFolder,
              `${afterState.id}_after_click.png`
            ),
            fullPage: true,
          });

          // 分析变化
          const changes = this.detectStateChanges(beforeState, afterState);

          probeResults.push({
            component: component,
            action: "click",
            beforeState: beforeState.id,
            afterState: afterState.id,
            changes: changes,
            success: true,
          });

          console.log(
            `  ✅ 点击 ${component.id}: ${
              changes.hasSignificantChange ? "有显著变化" : "无明显变化"
            }`
          );
        } catch (error) {
          console.log(`  ❌ 点击 ${component.id} 失败: ${error.message}`);
          probeResults.push({
            component: component,
            action: "click",
            success: false,
            error: error.message,
          });
        }
      }

      if (component.type === "input") {
        // 测试不同输入值
        const valuesToTest =
          testValues.length > 0 ? testValues : ["", "10", "abc", "999"];

        for (const value of valuesToTest) {
          const beforeState = await this.capturePageState(
            `before_input_${component.id}_${value || "empty"}`
          );

          try {
            // 清空并输入新值
            await this.page.fill(component.selector, value);
            await waitForPageStable(this.page, 200);

            const afterState = await this.capturePageState(
              `after_input_${component.id}_${value || "empty"}`
            );

            // 截图
            await this.page.screenshot({
              path: path.join(
                screenshotFolder,
                `${afterState.id}_input_value.png`
              ),
              fullPage: true,
            });

            const changes = this.detectStateChanges(beforeState, afterState);

            probeResults.push({
              component: component,
              action: "fill",
              value: value,
              beforeState: beforeState.id,
              afterState: afterState.id,
              changes: changes,
              success: true,
            });
          } catch (error) {
            probeResults.push({
              component: component,
              action: "fill",
              value: value,
              success: false,
              error: error.message,
            });
          }
        }
      }

      return probeResults;
    } catch (error) {
      console.error(
        `❌ 探测组件 ${component.id} 时发生严重错误: ${error.message}`
      );
      probeResults.push({
        component: component,
        action: "probe_failed",
        success: false,
        error: error.message,
        critical_failure: true,
      });
      return probeResults;
    }
  }
}

// ====== 新增：实际FSM重建器 ======
class ActualFSMBuilder {
  constructor() {
    this.states = new Map();
    this.events = new Map();
    this.transitions = [];
    this.components = [];
  }

  // 基于探测结果构建实际FSM
  buildFSMFromProbeResults(components, probeResults, stateCaptures) {
    console.log(`🏗️ 开始构建实际FSM...`);

    // 添加初始状态
    this.addState("S0_Idle", "Idle", "idle", [
      "renderPage()",
      "enableControls()",
    ]);

    let stateCounter = 1;

    // 分析组件列表
    this.components = components
      .map((comp) => comp.type)
      .filter((v, i, a) => a.indexOf(v) === i);

    // 基于探测结果构建状态和转换
    probeResults.forEach((result) => {
      if (!result.success || !result.changes.hasSignificantChange) {
        return; // 跳过失败或无变化的操作
      }

      const component = result.component;
      const action = result.action;

      // 推断语义类型
      const semantic = this.inferSemantics(component, action, result.changes);

      // 创建事件
      const eventId = `User${action.charAt(0).toUpperCase() + action.slice(1)}${
        component.id
      }`;
      const event = {
        id: eventId,
        event_type: "user_action",
        description: `User ${action}s ${component.type} ${component.id}`,
        component: component.id,
        action: action,
      };
      this.events.set(eventId, event);

      // 创建目标状态
      const targetStateId = `S${stateCounter++}_${semantic}`;
      const targetState = this.inferTargetState(semantic, result.changes);
      this.addState(
        targetStateId,
        semantic,
        "atomic",
        targetState.entry_actions,
        targetState.exit_actions
      );

      // 创建转换
      const transition = {
        from: "S0_Idle",
        to: targetStateId,
        event: eventId,
        guard: this.inferGuard(component, action, result.value),
        actions: this.inferActions(component, action, semantic),
        expected_observables: this.inferObservables(
          component,
          action,
          result.changes
        ),
        timeout: 2000,
        actual_changes: result.changes,
      };
      this.transitions.push(transition);

      console.log(
        `  ✅ 添加转换: ${transition.from} -> ${transition.to} (${semantic})`
      );
    });

    return this.buildFinalFSM();
  }

  addState(id, label, type, entry_actions = [], exit_actions = []) {
    const state = {
      id: id,
      label: label,
      type: type,
      entry_actions: entry_actions,
      exit_actions: exit_actions,
    };
    this.states.set(id, state);
    return state;
  }

  inferSemantics(component, action, changes) {
    // 基于组件类型和文本推断语义
    if (component.type === "button") {
      const text = component.text.toLowerCase();
      if (text.includes("insert") || text.includes("add")) return "InsertStart";
      if (text.includes("delete") || text.includes("remove"))
        return "DeleteStart";
      if (text.includes("search") || text.includes("find"))
        return "SearchStart";
      if (text.includes("reset") || text.includes("clear")) return "Reset";
    }

    if (component.type === "input" && action === "fill") {
      return "InputValidation";
    }

    // 基于变化类型推断
    if (changes.changeTypes.includes("visual_structure_change")) {
      if (
        changes.details.visualElements &&
        changes.details.visualElements.diff > 0
      ) {
        return "NodeInserted";
      } else if (changes.details.visualElements.diff < 0) {
        return "NodeDeleted";
      }
    }

    return "UnknownAction";
  }

  inferTargetState(semantic, changes) {
    const stateTemplates = {
      InsertStart: {
        entry_actions: ["readInputValue()", "highlightInput()"],
        exit_actions: ["clearHighlight()"],
      },
      InputValidation: {
        entry_actions: ["validateInput()", "showValidationFeedback()"],
        exit_actions: [],
      },
      NodeInserted: {
        entry_actions: ["updateTree()", "renderNewNode()"],
        exit_actions: ["enableControls()"],
      },
      Reset: {
        entry_actions: ["clearTree()", "resetView()"],
        exit_actions: ["returnToIdle()"],
      },
      UnknownAction: {
        entry_actions: ["logAction()"],
        exit_actions: [],
      },
    };

    return stateTemplates[semantic] || stateTemplates["UnknownAction"];
  }

  inferGuard(component, action, value) {
    if (component.type === "input") {
      return value && value.trim() !== "" ? "inputNotEmpty" : "inputEmpty";
    }
    if (component.type === "button") {
      return "buttonEnabled";
    }
    return "true";
  }

  inferActions(component, action, semantic) {
    const actionMap = {
      InsertStart: ["captureInput()", "disableControls()"],
      InputValidation: ["validateValue()", "setErrorState()"],
      NodeInserted: ["insertNode()", "updateVisualization()"],
      Reset: ["clearAllNodes()", "resetState()"],
    };
    return actionMap[semantic] || ["performAction()"];
  }

  inferObservables(component, action, changes) {
    const observables = [];

    if (component.type === "input") {
      observables.push("dom:inputValueChanged");
    }
    if (component.type === "button") {
      observables.push(`dom:${component.id}ButtonClicked`);
    }
    if (changes.changeTypes.includes("visual_structure_change")) {
      observables.push("dom:visualStructureChanged");
    }
    if (changes.changeTypes.includes("element_count_change")) {
      observables.push("dom:elementCountChanged");
    }

    return observables;
  }

  buildFinalFSM() {
    return {
      meta: {
        concept: "ExtractedFromActualPage",
        extraction_method: "automated_probing",
        timestamp: new Date().toISOString(),
      },
      states: Array.from(this.states.values()),
      events: Array.from(this.events.values()),
      transitions: this.transitions,
      components: this.components,
    };
  }
}

// ====== 核心FSM提取函数（重构为可复用） ======
async function processSingleHtmlFile(page, htmlFileName) {
  console.log(`\n🚀 开始智能FSM提取: ${htmlFileName}`);

  // 设置页面超时和Alert处理
  page.setDefaultTimeout(30000);
  page.setDefaultNavigationTimeout(30000);

  // Alert处理器
  const alertMessages = [];
  page.on("dialog", async (dialog) => {
    alertMessages.push(dialog.message());
    console.log(`    💬 Alert捕获: ${dialog.message()}`);
    await dialog.accept();
  });

  // 创建输出文件夹
  const htmlFileBaseName = path.basename(htmlFileName, ".html");
  const screenshotFolder = path.join(VISUALS_FOLDER, htmlFileBaseName);
  const fsmOutputFolder = path.join(FSM_OUTPUT_FOLDER, htmlFileBaseName);
  await ensureDirectory(screenshotFolder);
  await ensureDirectory(fsmOutputFolder);

  // 导航到HTML文件
  const htmlUrl = getHtmlFilePath(htmlFileName);
  console.log(`🌐 导航到: ${htmlUrl}`);

  try {
    await page.goto(htmlUrl, {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });
    await waitForPageStable(page, 2000);
  } catch (error) {
    console.error(`❌ 页面导航失败: ${error.message}`);
    throw error;
  }

  // ====== 步骤1: 提取理想FSM配置 ======
  console.log(`📋 提取理想FSM配置...`);
  const idealFSM = await extractIdealFSMFromPage(page);

  // ====== 步骤2: 自动检测页面组件 ======
  console.log(`\n🔍 开始自动组件检测...`);
  const detector = new ComponentDetector(page);
  const detectedComponents = await detector.detectComponents();

  // ====== 步骤3: 行为探测 ======
  console.log(`\n🧪 开始行为探测...`);
  const prober = new BehaviorProber(page);

  // 捕获初始状态
  const initialState = await prober.capturePageState("Initial");
  await page.screenshot({
    path: path.join(screenshotFolder, `${initialState.id}_initial.png`),
    fullPage: true,
  });

  // 对每个组件进行探测
  const allProbeResults = [];
  for (let i = 0; i < detectedComponents.length; i++) {
    const component = detectedComponents[i];
    console.log(
      `\n📋 探测组件 ${i + 1}/${detectedComponents.length}: ${
        component.type
      } - ${component.id}`
    );

    try {
      // 重新加载页面确保干净状态
      await page.reload({ waitUntil: "domcontentloaded", timeout: 20000 });
      await waitForPageStable(page, 2000);

      // 检查页面是否正常加载
      if (page.isClosed()) {
        console.error(`❌ 页面在探测过程中被关闭`);
        break;
      }

      const testValues =
        component.type === "input" ? ["", "10", "50", "abc", "999"] : [];
      const probeResults = await prober.probeComponent(
        component,
        screenshotFolder,
        testValues
      );
      allProbeResults.push(...probeResults);
    } catch (error) {
      console.error(`❌ 探测组件 ${component.id} 失败: ${error.message}`);
      allProbeResults.push({
        component: component,
        action: "exploration_failed",
        success: false,
        error: error.message,
      });

      // 如果是严重错误，尝试重新创建页面
      if (
        error.message.includes("closed") ||
        error.message.includes("Target")
      ) {
        console.log(`⚠️ 尝试恢复页面连接...`);
        try {
          const context = page.context();
          page = await context.newPage();
          page.setDefaultTimeout(30000);
          page.setDefaultNavigationTimeout(30000);

          // 重新设置Alert处理器
          page.on("dialog", async (dialog) => {
            alertMessages.push(dialog.message());
            console.log(`    💬 Alert捕获: ${dialog.message()}`);
            await dialog.accept();
          });

          await page.goto(htmlUrl, {
            waitUntil: "domcontentloaded",
            timeout: 20000,
          });
          await waitForPageStable(page, 2000);

          // 重新初始化探测器
          prober = new BehaviorProber(page);
        } catch (recoveryError) {
          console.error(`❌ 页面恢复失败: ${recoveryError.message}`);
          break;
        }
      }
    }

    // 在组件之间添加小延迟避免过载
    if (i < detectedComponents.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  // ====== 步骤4: 构建实际FSM ======
  console.log(`\n🏗️ 开始构建实际FSM...`);
  const fsmBuilder = new ActualFSMBuilder();
  const extractedFSM = fsmBuilder.buildFSMFromProbeResults(
    detectedComponents,
    allProbeResults,
    prober.stateCaptures
  );

  // ====== 步骤5: 保存结果 ======
  // 保存组件检测结果
  const componentReport = {
    timestamp: new Date().toISOString(),
    html_file: htmlFileName,
    detected_components: detectedComponents,
    component_summary: {
      total: detectedComponents.length,
      by_type: detectedComponents.reduce((acc, comp) => {
        acc[comp.type] = (acc[comp.type] || 0) + 1;
        return acc;
      }, {}),
    },
  };
  await fs.writeFile(
    path.join(fsmOutputFolder, "detected_components.json"),
    JSON.stringify(componentReport, null, 2),
    "utf-8"
  );

  // 保存探测结果
  const probeReport = {
    timestamp: new Date().toISOString(),
    html_file: htmlFileName,
    probe_results: allProbeResults,
    state_captures: prober.stateCaptures,
    alert_messages: alertMessages,
    summary: {
      total_probes: allProbeResults.length,
      successful_probes: allProbeResults.filter((r) => r.success).length,
      significant_changes: allProbeResults.filter(
        (r) => r.success && r.changes?.hasSignificantChange
      ).length,
    },
  };
  await fs.writeFile(
    path.join(fsmOutputFolder, "probe_results.json"),
    JSON.stringify(probeReport, null, 2),
    "utf-8"
  );

  // 保存提取的FSM
  await fs.writeFile(
    path.join(fsmOutputFolder, "extracted_fsm.json"),
    JSON.stringify(extractedFSM, null, 2),
    "utf-8"
  );

  // 保存理想FSM（如果存在）
  if (idealFSM) {
    await fs.writeFile(
      path.join(fsmOutputFolder, "ideal_fsm.json"),
      JSON.stringify(idealFSM, null, 2),
      "utf-8"
    );
  }

  // ====== 步骤6: FSM对比分析 ======
  const comparison = await performFSMComparison(
    extractedFSM,
    idealFSM,
    htmlFileName
  );
  await fs.writeFile(
    path.join(fsmOutputFolder, "fsm_comparison.json"),
    JSON.stringify(comparison, null, 2),
    "utf-8"
  );

  // ====== 生成分析报告 ======
  const analysisReport = {
    timestamp: new Date().toISOString(),
    html_file: htmlFileName,
    analysis: {
      components: {
        detected: detectedComponents.length,
        types: Object.keys(componentReport.component_summary.by_type),
      },
      interactions: {
        total_probed: allProbeResults.length,
        successful: allProbeResults.filter((r) => r.success).length,
        with_changes: allProbeResults.filter(
          (r) => r.success && r.changes?.hasSignificantChange
        ).length,
      },
      fsm: {
        extracted_states: extractedFSM.states.length,
        extracted_transitions: extractedFSM.transitions.length,
        extracted_events: extractedFSM.events.length,
        has_ideal_fsm: !!idealFSM,
        ideal_states: idealFSM?.states?.length || 0,
        ideal_transitions: idealFSM?.transitions?.length || 0,
        state_coverage: comparison.metrics?.state_coverage?.score || 0,
        transition_coverage:
          comparison.metrics?.transition_coverage?.score || 0,
      },
    },
    paths: {
      screenshots: screenshotFolder,
      fsm_data: fsmOutputFolder,
    },
  };

  await fs.writeFile(
    path.join(fsmOutputFolder, "analysis_report.json"),
    JSON.stringify(analysisReport, null, 2),
    "utf-8"
  );

  // ====== 输出总结 ======
  console.log(`\n🎉 ${htmlFileName} FSM提取完成!`);
  console.log(`📊 检测组件: ${detectedComponents.length} 个`);
  console.log(`🧪 探测操作: ${allProbeResults.length} 次`);
  console.log(
    `✅ 成功操作: ${allProbeResults.filter((r) => r.success).length} 次`
  );
  console.log(
    `🔄 有效变化: ${
      allProbeResults.filter(
        (r) => r.success && r.changes?.hasSignificantChange
      ).length
    } 次`
  );
  console.log(`🏗️ 提取状态: ${extractedFSM.states.length} 个`);
  console.log(`🔀 提取转换: ${extractedFSM.transitions.length} 个`);

  if (idealFSM) {
    console.log(
      `✅ 状态覆盖率: ${(
        comparison.metrics?.state_coverage?.score * 100 || 0
      ).toFixed(1)}%`
    );
    console.log(
      `✅ 转换覆盖率: ${(
        comparison.metrics?.transition_coverage?.score * 100 || 0
      ).toFixed(1)}%`
    );
  }

  return analysisReport;
}

// FSM对比分析函数
async function performFSMComparison(extractedFSM, idealFSM, htmlFileName) {
  const comparison = {
    timestamp: new Date().toISOString(),
    html_file: htmlFileName,
    has_ideal_reference: !!idealFSM,
    metrics: {},
  };

  if (idealFSM) {
    // 状态覆盖率分析
    const idealStateLabels = idealFSM.states?.map((s) => s.label || s.id) || [];
    const extractedStateLabels =
      extractedFSM.states?.map((s) => s.label || s.id) || [];

    const matchedStates = extractedStateLabels.filter(
      (state) =>
        state &&
        idealStateLabels.some(
          (ideal) =>
            (ideal && state.toLowerCase().includes(ideal.toLowerCase())) ||
            (ideal && ideal.toLowerCase().includes(state.toLowerCase()))
        )
    );

    const stateCoverage =
      idealStateLabels.length > 0
        ? matchedStates.length / idealStateLabels.length
        : 0;

    // 转换覆盖率分析
    const idealTransitions = idealFSM.transitions || [];
    const extractedTransitions = extractedFSM.transitions || [];

    const transitionCoverage =
      idealTransitions.length > 0
        ? Math.min(extractedTransitions.length / idealTransitions.length, 1)
        : 0;

    comparison.metrics = {
      state_coverage: {
        score: stateCoverage,
        ideal_states: idealStateLabels.length,
        extracted_states: extractedStateLabels.length,
        matched_states: matchedStates.length,
        missing_states: idealStateLabels.filter(
          (ideal) =>
            ideal &&
            !extractedStateLabels.some(
              (extracted) =>
                extracted &&
                (extracted.toLowerCase().includes(ideal.toLowerCase()) ||
                  ideal.toLowerCase().includes(extracted.toLowerCase()))
            )
        ),
      },
      transition_coverage: {
        score: transitionCoverage,
        ideal_transitions: idealTransitions.length,
        extracted_transitions: extractedTransitions.length,
      },
      component_coverage: {
        ideal_components: idealFSM.components?.length || 0,
        extracted_components: extractedFSM.components?.length || 0,
      },
    };
  } else {
    // 没有理想FSM时的基础评估
    comparison.metrics = {
      extraction_quality: {
        has_states: extractedFSM.states?.length > 0,
        has_transitions: extractedFSM.transitions?.length > 0,
        has_events: extractedFSM.events?.length > 0,
        state_count: extractedFSM.states?.length || 0,
        transition_count: extractedFSM.transitions?.length || 0,
        event_count: extractedFSM.events?.length || 0,
      },
    };
  }

  return comparison;
}

// 确保输出目录存在
await ensureDirectory(VISUALS_FOLDER);
await ensureDirectory(FSM_OUTPUT_FOLDER);

test.describe("智能FSM批量提取和分析", () => {
  // 批量处理所有HTML文件
  test("批量FSM提取和分析 - 所有HTML文件", async ({ page }) => {
    if (!BATCH_MODE) {
      test.skip("跳过批量模式 - 设置 BATCH_MODE=true 启用");
      return;
    }

    const htmlFiles = await discoverHtmlFiles();
    if (htmlFiles.length === 0) {
      throw new Error("未找到任何HTML文件");
    }

    console.log(`\n🎯 批量处理模式 - 共 ${htmlFiles.length} 个文件`);

    const batchResults = [];
    const batchSummary = {
      timestamp: new Date().toISOString(),
      total_files: htmlFiles.length,
      processed_files: 0,
      failed_files: 0,
      results: [],
      batch_metrics: {
        average_state_coverage: 0,
        average_transition_coverage: 0,
        total_components_detected: 0,
        total_interactions_tested: 0,
      },
    };

    for (let i = 0; i < htmlFiles.length; i++) {
      const htmlFile = htmlFiles[i];
      console.log(`\n📁 处理文件 ${i + 1}/${htmlFiles.length}: ${htmlFile}`);
      console.log(`⏰ 开始时间: ${new Date().toLocaleTimeString()}`);

      try {
        const analysisResult = await processSingleHtmlFile(page, htmlFile);
        batchResults.push(analysisResult);
        batchSummary.processed_files++;

        // 累积指标
        const stateCoverage = analysisResult.analysis?.fsm?.state_coverage || 0;
        const transitionCoverage =
          analysisResult.analysis?.fsm?.transition_coverage || 0;
        const componentsCount =
          analysisResult.analysis?.components?.detected || 0;
        const interactionsCount =
          analysisResult.analysis?.interactions?.total_probed || 0;

        batchSummary.batch_metrics.total_components_detected += componentsCount;
        batchSummary.batch_metrics.total_interactions_tested +=
          interactionsCount;

        console.log(
          `✅ ${htmlFile} 处理完成 (状态覆盖率: ${(stateCoverage * 100).toFixed(
            1
          )}%)`
        );
      } catch (error) {
        console.error(`❌ ${htmlFile} 处理失败: ${error.message}`);
        batchSummary.failed_files++;
        batchResults.push({
          html_file: htmlFile,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }

      // 页面清理和小休息
      try {
        await page.close();
        page = await page.context().newPage();
      } catch (e) {
        // 忽略页面清理错误
      }

      // 避免过载，稍作休息
      if (i < htmlFiles.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // 计算平均指标
    const successfulResults = batchResults.filter((r) => !r.error);
    if (successfulResults.length > 0) {
      const stateCoverages = successfulResults.map(
        (r) => r.analysis?.fsm?.state_coverage || 0
      );
      const transitionCoverages = successfulResults.map(
        (r) => r.analysis?.fsm?.transition_coverage || 0
      );

      batchSummary.batch_metrics.average_state_coverage =
        stateCoverages.reduce((a, b) => a + b, 0) / stateCoverages.length;
      batchSummary.batch_metrics.average_transition_coverage =
        transitionCoverages.reduce((a, b) => a + b, 0) /
        transitionCoverages.length;
    }

    batchSummary.results = batchResults;

    // 保存批量处理报告
    const batchReportPath = path.join(
      FSM_OUTPUT_FOLDER,
      "batch_analysis_report.json"
    );
    await fs.writeFile(
      batchReportPath,
      JSON.stringify(batchSummary, null, 2),
      "utf-8"
    );

    // 生成批量摘要
    console.log(`\n🎊 批量处理完成!`);
    console.log(`📊 处理统计:`);
    console.log(
      `   ✅ 成功: ${batchSummary.processed_files}/${batchSummary.total_files}`
    );
    console.log(
      `   ❌ 失败: ${batchSummary.failed_files}/${batchSummary.total_files}`
    );
    console.log(`📈 平均指标:`);
    console.log(
      `   📊 平均状态覆盖率: ${(
        batchSummary.batch_metrics.average_state_coverage * 100
      ).toFixed(1)}%`
    );
    console.log(
      `   📊 平均转换覆盖率: ${(
        batchSummary.batch_metrics.average_transition_coverage * 100
      ).toFixed(1)}%`
    );
    console.log(
      `   🔍 总检测组件: ${batchSummary.batch_metrics.total_components_detected}`
    );
    console.log(
      `   🧪 总测试交互: ${batchSummary.batch_metrics.total_interactions_tested}`
    );
    console.log(`💾 批量报告: ${batchReportPath}`);
  });

  // 单文件处理 (原有功能保留)
  test(`单文件FSM提取: ${TARGET_HTML_FILE}`, async ({ page }) => {
    if (BATCH_MODE) {
      test.skip("跳过单文件模式 - 当前为批量处理模式");
      return;
    }

    try {
      const analysisResult = await processSingleHtmlFile(
        page,
        TARGET_HTML_FILE
      );
      console.log(`\n📋 单文件分析完成: ${TARGET_HTML_FILE}`);
      console.log(`📁 结果位置: ${analysisResult.paths.fsm_data}`);
    } catch (error) {
      console.error(`❌ 单文件处理失败: ${error.message}`);
      throw error;
    }
  });

  // 生成整体分析报告
  test("生成整体分析报告", async ({ page }) => {
    const htmlFiles = await discoverHtmlFiles();
    if (htmlFiles.length === 0) {
      test.skip("没有找到HTML文件，跳过报告生成");
      return;
    }

    console.log(`\n📊 生成整体分析报告...`);

    const overallReport = {
      timestamp: new Date().toISOString(),
      summary: {
        total_html_files: htmlFiles.length,
        analyzed_files: 0,
        successful_extractions: 0,
        files_with_ideal_fsm: 0,
        total_states_extracted: 0,
        total_transitions_extracted: 0,
        best_state_coverage: 0,
        worst_state_coverage: 1,
        average_state_coverage: 0,
      },
      file_details: [],
    };

    // 检查每个文件的结果
    for (const htmlFile of htmlFiles) {
      const htmlFileBaseName = path.basename(htmlFile, ".html");
      const reportPath = path.join(
        FSM_OUTPUT_FOLDER,
        htmlFileBaseName,
        "analysis_report.json"
      );

      try {
        if (
          await fs
            .access(reportPath)
            .then(() => true)
            .catch(() => false)
        ) {
          const fileReport = JSON.parse(await fs.readFile(reportPath, "utf-8"));
          overallReport.summary.analyzed_files++;

          if (fileReport.analysis?.fsm?.extracted_states > 0) {
            overallReport.summary.successful_extractions++;
          }

          if (fileReport.analysis?.fsm?.has_ideal_fsm) {
            overallReport.summary.files_with_ideal_fsm++;
          }

          overallReport.summary.total_states_extracted +=
            fileReport.analysis?.fsm?.extracted_states || 0;
          overallReport.summary.total_transitions_extracted +=
            fileReport.analysis?.fsm?.extracted_transitions || 0;

          const stateCoverage = fileReport.analysis?.fsm?.state_coverage || 0;
          if (stateCoverage > overallReport.summary.best_state_coverage) {
            overallReport.summary.best_state_coverage = stateCoverage;
          }
          if (stateCoverage < overallReport.summary.worst_state_coverage) {
            overallReport.summary.worst_state_coverage = stateCoverage;
          }

          overallReport.file_details.push({
            file: htmlFile,
            status: "analyzed",
            states: fileReport.analysis?.fsm?.extracted_states || 0,
            transitions: fileReport.analysis?.fsm?.extracted_transitions || 0,
            state_coverage: stateCoverage,
            transition_coverage:
              fileReport.analysis?.fsm?.transition_coverage || 0,
            components: fileReport.analysis?.components?.detected || 0,
          });
        } else {
          overallReport.file_details.push({
            file: htmlFile,
            status: "not_analyzed",
            error: "Analysis report not found",
          });
        }
      } catch (error) {
        overallReport.file_details.push({
          file: htmlFile,
          status: "error",
          error: error.message,
        });
      }
    }

    // 计算平均覆盖率
    const analyzedFiles = overallReport.file_details.filter(
      (f) => f.status === "analyzed"
    );
    if (analyzedFiles.length > 0) {
      const stateCoverages = analyzedFiles.map((f) => f.state_coverage || 0);
      overallReport.summary.average_state_coverage =
        stateCoverages.reduce((a, b) => a + b, 0) / stateCoverages.length;
    }

    // 保存整体报告
    const overallReportPath = path.join(
      FSM_OUTPUT_FOLDER,
      "overall_analysis_report.json"
    );
    await fs.writeFile(
      overallReportPath,
      JSON.stringify(overallReport, null, 2),
      "utf-8"
    );

    // 输出报告摘要
    console.log(`\n📈 整体分析报告:`);
    console.log(`📁 HTML文件总数: ${overallReport.summary.total_html_files}`);
    console.log(`✅ 已分析文件: ${overallReport.summary.analyzed_files}`);
    console.log(
      `🏗️ 成功提取FSM: ${overallReport.summary.successful_extractions}`
    );
    console.log(
      `💡 包含理想FSM: ${overallReport.summary.files_with_ideal_fsm}`
    );
    console.log(
      `📊 平均状态覆盖率: ${(
        overallReport.summary.average_state_coverage * 100
      ).toFixed(1)}%`
    );
    console.log(
      `🏆 最佳覆盖率: ${(
        overallReport.summary.best_state_coverage * 100
      ).toFixed(1)}%`
    );
    console.log(
      `⚠️ 最差覆盖率: ${(
        overallReport.summary.worst_state_coverage * 100
      ).toFixed(1)}%`
    );
    console.log(`💾 整体报告: ${overallReportPath}`);
  });
});
