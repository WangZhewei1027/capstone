import "dotenv/config";
import process from "node:process";
import { callAIStream } from "./ai-api.mjs";

/**
 * 修复常见的 JSON 格式问题
 */
function fixCommonJSONIssues(jsonString) {
  let fixed = jsonString;

  // 1. 移除注释（单行和多行）
  fixed = fixed.replace(/\/\*[\s\S]*?\*\//g, "");
  fixed = fixed.replace(/\/\/.*/g, "");

  // 2. 修复尾随逗号
  fixed = fixed.replace(/,(\s*[}\]])/g, "$1");

  // 3. 确保属性名使用双引号
  // 匹配未加引号或单引号的属性名
  fixed = fixed.replace(
    /(['"])?([a-zA-Z0-9_]+)(['"])?\s*:/g,
    (match, q1, key, q2) => {
      // 如果已经有双引号，保持不变
      if (q1 === '"' && q2 === '"') return match;
      // 否则添加双引号
      return `"${key}":`;
    }
  );

  // 4. 修复单引号字符串为双引号
  fixed = fixed.replace(/:\s*'([^']*)'/g, ': "$1"');

  // 5. 移除不可见的特殊字符
  fixed = fixed.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");

  return fixed;
}

/**
 * 更激进的 JSON 修复
 */
function aggressiveJSONFix(jsonString) {
  let fixed = jsonString;

  // 首先应用基本修复
  fixed = fixCommonJSONIssues(fixed);

  // 尝试找到 JSON 的开始和结束
  const firstBrace = fixed.indexOf("{");
  const lastBrace = fixed.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1) {
    fixed = fixed.substring(firstBrace, lastBrace + 1);
  }

  // 修复不完整的字符串
  // 如果有未闭合的引号，尝试修复
  const quoteCount = (fixed.match(/"/g) || []).length;
  if (quoteCount % 2 !== 0) {
    // 奇数个引号，可能有未闭合的
    console.log("检测到未闭合的引号，尝试修复...");
    // 在最后一个引号后添加引号
    const lastQuoteIndex = fixed.lastIndexOf('"');
    if (lastQuoteIndex !== -1) {
      // 检查后面是否缺少内容
      const afterQuote = fixed.substring(lastQuoteIndex + 1).trim();
      if (!afterQuote.startsWith(",") && !afterQuote.startsWith("}")) {
        fixed = fixed.substring(0, lastQuoteIndex + 1) + '"' + afterQuote;
      }
    }
  }

  // 修复不完整的对象/数组
  let braceCount = 0;
  let bracketCount = 0;

  for (let i = 0; i < fixed.length; i++) {
    if (fixed[i] === "{") braceCount++;
    if (fixed[i] === "}") braceCount--;
    if (fixed[i] === "[") bracketCount++;
    if (fixed[i] === "]") bracketCount--;
  }

  // 添加缺失的闭合括号
  while (braceCount > 0) {
    fixed += "}";
    braceCount--;
  }
  while (bracketCount > 0) {
    fixed += "]";
    bracketCount--;
  }

  return fixed;
}

/**
 * 预处理 HTML 内容，移除所有 CSS 以减少 token 使用
 * @param {string} htmlContent - 完整的 HTML 代码
 * @returns {string} 移除 CSS 后的 HTML 代码
 */
function preprocessHtmlContent(htmlContent) {
  let processed = htmlContent;

  // 移除 <style> 标签及其内容
  processed = processed.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");

  // 移除内联 style 属性
  processed = processed.replace(/\s+style=["'][^"']*["']/gi, "");

  // 移除多余的空白行
  processed = processed.replace(/\n\s*\n\s*\n/g, "\n\n");

  return processed.trim();
}

/**
 * FSM Agent - 分析 HTML 代码并生成有限状态机定义
 * @param {string} model - 模型名称
 * @param {string} userPrompt - 用户提示（HTML 内容和主题）
 * @param {string} systemPrompt - 系统提示
 * @param {object} options - 配置选项
 * @param {boolean} options.showProgress - 是否显示进度
 * @param {string} options.taskId - 任务 ID
 * @param {number} options.temperature - 温度参数
 * @returns {Promise<object>} FSM JSON 对象
 */

export async function generateFSM(
  model,
  userPrompt,
  systemPrompt = null,
  options = {}
) {
  const { showProgress = false, taskId = null, temperature = 0.3 } = options;

  // 默认系统提示
  const defaultSystemPrompt = `You are an expert at analyzing interactive web applications and extracting finite state machines (FSM).

Your task is to:
1. Analyze the provided HTML/JavaScript code
2. Identify all interactive states the application can be in
3. Identify all events/actions that trigger state transitions
4. Identify any onEnter/onExit actions for each state
5. Extract actual DOM selectors for each interactive element
6. Generate a clean FSM definition in JSON format

CRITICAL: You must output ONLY valid JSON. No markdown, no code blocks, no explanations.

The FSM should follow this structure:
{
  "meta": {
    "concept": "BinarySearchTree",
    "topic": "Binary Search Tree Visualization",
    "educational_goal": "Demonstrate BST insertion and traversal",
    "expected_interactions": ["insert", "delete", "search", "reset"]
  },
  "states": [
    {
      "id": "S0_Idle",
      "label": "Idle",
      "type": "idle",
      "entry_actions": ["renderTree()", "enableControls()"],
      "exit_actions": []
    },
    {
      "id": "S1_InsertStart",
      "label": "InsertStart",
      "type": "atomic",
      "entry_actions": ["readInputValue()", "highlightInput()"],
      "exit_actions": ["clearHighlight()"]
    },
    {
      "id": "S2_ValidatingInput",
      "label": "ValidatingInput",
      "type": "atomic",
      "entry_actions": ["validateInput()", "showValidationFeedback()"],
      "exit_actions": []
    },
    {
      "id": "S3_ErrorAlert",
      "label": "ErrorAlert",
      "type": "atomic",
      "entry_actions": ["showErrorDialog()", "highlightError()"],
      "exit_actions": ["clearError()"]
    },
    {
      "id": "S4_InsertingNode",
      "label": "InsertingNode",
      "type": "atomic",
      "entry_actions": ["findInsertPosition()", "createNewNode()"],
      "exit_actions": []
    },
    {
      "id": "S5_DrawingTree",
      "label": "DrawingTree",
      "type": "atomic",
      "entry_actions": ["updateTreeVisualization()", "animateInsertion()"],
      "exit_actions": ["enableControls()"]
    },
    {
      "id": "S6_TreeResetting",
      "label": "TreeResetting",
      "type": "atomic",
      "entry_actions": ["clearAllNodes()", "resetVisualization()"],
      "exit_actions": ["returnToIdle()"]
    }
  ],
  "events": [
    {
      "id": "UserClicksInsert",
      "event_type": "user_action",
      "description": "User clicks the Insert button"
    },
    {
      "id": "UserEntersInput",
      "event_type": "user_action",
      "description": "User enters value in input field"
    },
    {
      "id": "UserClicksReset",
      "event_type": "user_action",
      "description": "User clicks the Reset button"
    },
    {
      "id": "InputValidationComplete",
      "event_type": "system_event",
      "description": "Input validation completes successfully"
    },
    {
      "id": "InputValidationFailed",
      "event_type": "system_event",
      "description": "Input validation fails"
    },
    {
      "id": "NodeInsertionComplete",
      "event_type": "system_event",
      "description": "Node insertion and tree update complete"
    },
    {
      "id": "TreeResetComplete",
      "event_type": "system_event",
      "description": "Tree reset operation complete"
    },
    {
      "id": "UserDismissesAlert",
      "event_type": "user_action",
      "description": "User dismisses error alert dialog"
    }
  ],
  "transitions": [
    {
      "from": "S0_Idle",
      "to": "S1_InsertStart",
      "event": "UserClicksInsert",
      "guard": "inputNotEmpty",
      "actions": ["captureInput()", "disableControls()"],
      "expected_observables": ["dom:readInputValue", "dom:insertButtonClicked"],
      "timeout": 2000
    },
    {
      "from": "S1_InsertStart",
      "to": "S2_ValidatingInput",
      "event": "InputValidationComplete",
      "guard": "inputIsValid",
      "actions": ["validateValue()", "prepareInsertion()"],
      "expected_observables": ["dom:inputValidated"],
      "timeout": 1000
    },
    {
      "from": "S2_ValidatingInput",
      "to": "S4_InsertingNode",
      "event": "InputValidationComplete",
      "guard": "validNumber",
      "actions": ["parseInputValue()", "beginInsertion()"],
      "expected_observables": ["dom:nodeCreationStarted"],
      "timeout": 1500
    },
    {
      "from": "S1_InsertStart",
      "to": "S3_ErrorAlert",
      "event": "InputValidationFailed",
      "guard": "inputIsEmpty",
      "actions": ["showError()", "focusInput()"],
      "expected_observables": ["dom:errorDialogShown"],
      "timeout": 1000
    },
    {
      "from": "S3_ErrorAlert",
      "to": "S0_Idle",
      "event": "UserDismissesAlert",
      "guard": "true",
      "actions": ["clearErrorState()", "resetInput()"],
      "expected_observables": ["dom:errorDialogClosed"],
      "timeout": 500
    },
    {
      "from": "S4_InsertingNode",
      "to": "S5_DrawingTree",
      "event": "NodeInsertionComplete",
      "guard": "nodeInsertedSuccessfully",
      "actions": ["updateTreeStructure()", "triggerVisualization()"],
      "expected_observables": [
        "dom:treeStructureChanged",
        "dom:newNodeVisible"
      ],
      "timeout": 3000
    },
    {
      "from": "S5_DrawingTree",
      "to": "S0_Idle",
      "event": "NodeInsertionComplete",
      "guard": "visualizationComplete",
      "actions": ["enableControls()", "clearInput()"],
      "expected_observables": ["dom:visualizationComplete"],
      "timeout": 1000
    },
    {
      "from": "S0_Idle",
      "to": "S6_TreeResetting",
      "event": "UserClicksReset",
      "guard": "treeNotEmpty",
      "actions": ["confirmReset()", "beginClearOperation()"],
      "expected_observables": ["dom:resetButtonClicked"],
      "timeout": 500
    },
    {
      "from": "S6_TreeResetting",
      "to": "S0_Idle",
      "event": "TreeResetComplete",
      "guard": "true",
      "actions": ["enableControls()", "resetInputField()"],
      "expected_observables": ["dom:treeCleared", "dom:visualizationReset"],
      "timeout": 1000
    }
  ],
  "components": ["input", "insert", "reset", "tree_visualization"]
}


IMPORTANT JSON RULES:
- All property names must be in double quotes: "name", "onEnter", etc.
- All string values must be in double quotes: "idle", "noop", etc.
- No trailing commas after the last item in objects or arrays
- No comments (// or /* */)
- No single quotes - always use double quotes
- Ensure all braces and brackets are properly closed
- The "triggers" field MUST contain actual selectors found in the HTML

Focus on:
- Button clicks and user interactions
- Animation states
- Data loading/processing states
- Visual feedback states (comparing, swapping, highlighting, etc.)
- Completion/done states
- Extract EXACT button IDs, classes, and selectors from HTML

Keep state names descriptive but concise (e.g., "idle", "comparing", "swapping", "playing", "paused", "done").
Event names should be UPPERCASE_WITH_UNDERSCORES.
For triggers, use comma-separated selectors if multiple elements can trigger the same event.

Output ONLY the JSON object, nothing else.`;

  try {
    if (showProgress) {
      console.log(`\n[${taskId || "FSM-Agent"}] 开始分析 HTML 生成 FSM...\n`);
    }

    const stream = await callAIStream(
      model,
      userPrompt,
      systemPrompt || defaultSystemPrompt,
      {
        temperature,
        response_format: { type: "json_object" },
      }
    );

    let fullContent = "";

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        fullContent += content;
        if (showProgress) {
          process.stdout.write(content);
        }
      }
    }

    if (showProgress) {
      console.log(`\n\n[${taskId || "FSM-Agent"}] FSM 生成完成！\n`);
    }

    // 清理可能的 markdown 代码块标记
    let cleanedContent = fullContent.trim();
    if (cleanedContent.startsWith("```json")) {
      cleanedContent = cleanedContent.replace(/^```json\s*/, "");
    }
    if (cleanedContent.startsWith("```")) {
      cleanedContent = cleanedContent.replace(/^```\s*/, "");
    }
    if (cleanedContent.endsWith("```")) {
      cleanedContent = cleanedContent.replace(/\s*```$/, "");
    }

    // 尝试修复常见的 JSON 问题
    // cleanedContent = fixCommonJSONIssues(cleanedContent);

    // 直接解析 JSON
    let fsmData;
    try {
      fsmData = JSON.parse(cleanedContent);

      // 验证基本结构
      if (!fsmData.states || !Array.isArray(fsmData.states)) {
        console.log("FSM 缺少 states 数组");
      }
    } catch (e) {
      fsmData = cleanedContent;
      console.error(
        `[${taskId || "FSM-Agent"}] JSON 解析失败，但流程继续...`,
        e
      );
    }

    if (showProgress) {
      console.log(
        `[${taskId || "FSM-Agent"}] FSM 验证通过: ${
          fsmData.states.length
        } 个状态, ${(fsmData.events || []).length} 个事件`
      );
    }

    return fsmData;
  } catch (err) {
    console.error(`[${taskId || "FSM-Agent"}] 生成 FSM 时出错:`, err);
    throw err;
  }
}
