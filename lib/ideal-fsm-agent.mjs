import "dotenv/config";
import process from "node:process";
import { callAIStream } from "./ai-api.mjs";

/**
 * Ideal FSM Agent - 生成给定概念的理想教学FSM定义
 * @param {string} model - 模型名称
 * @param {string} concept - 概念名称 (例如: "BinarySearchTree", "BubbleSort", "QuickSort")
 * @param {object} options - 配置选项
 * @param {boolean} options.showProgress - 是否显示进度
 * @param {string} options.taskId - 任务 ID
 * @param {number} options.temperature - 温度参数
 * @returns {Promise<object>} 理想FSM JSON 对象
 */
export async function generateIdealFSM(model, concept, options = {}) {
  const { showProgress = false, taskId = null, temperature = 0.2 } = options;

  // Ideal FSM system prompt
  const systemPrompt = `You are an assistant that, given a single input "concept name", must produce a machine-readable JSON describing the IDEAL interactive teaching FSM for that concept.

Requirements:
1. Output EXACTLY ONE JSON object and nothing else. Do not include any commentary, explanation, or markup outside the JSON.
2. The JSON must follow this top-level structure:
   {
     "meta": {...},
     "states": [...],
     "events": [...],
     "transitions": [...],
     "components": [...]
   }
3. Keep the component set **minimal** — include only the components that are strictly necessary to teach the core concept well. (E.g., input field, primary action buttons, a visualization area, reset/clear).
4. Focus on **core interactive functionality** and **observable feedback**. Every user-triggerable action included must produce at least one observable change (DOM element count/text/visual update/alert/console message/visual highlight) so automated probes can verify it.
5. Use clear semantic state labels (e.g., \`Idle\`, \`InsertStart\`, \`Compare\`, \`NodeInserted\`, \`SearchFound\`, \`ErrorAlert\`, \`DrawingTree\`, \`TreeResetting\`).
6. Include \`expected_interactions\` in \`meta\` listing the main interactions the FSM supports (e.g., ["insert","delete","search","traverse","reset"]).
7. For each state include: \`id\`, \`label\`, \`type\` (idle | atomic | operation), \`entry_actions\` (array of small descriptive strings), \`exit_actions\`.
8. For each event include: \`id\`, \`event_type\` ("user_action" or "system_event"), \`description\`.
9. For each transition include: \`from\`, \`to\`, \`event\`, optional \`guard\`, \`actions\` (list), \`expected_observables\` (list of small DOM/visual descriptors), and \`timeout\` (ms).
10. The JSON should be **complete and consistent** (events referenced by transitions must appear in events array; states referenced must appear in states).
11. Keep language simple and in English. Use semantic names not dependent on exact DOM IDs or implementation.
12. Prefer transitions that reflect the true pedagogical sequence (e.g., user clicks Insert → validate input → run comparisons/animations → node inserted → visualization complete → idle).
13. Only include **necessary** states and events — do not add optional UI extras like quizzes, summaries, or advanced analytics.

Use the following one-shot example as the output format and style model. Replace "BinarySearchTree" with the supplied concept name and adapt the states/events/transitions/components to that concept minimal-yet-complete interaction logic.

One-shot example (MUST be replicated as the example output style, verbatim here):

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

Now: produce the JSON for the supplied concept name only (replace the meta.concept value). Output MUST be valid JSON only.`;

  // User prompt with just the concept name
  const userPrompt = concept;

  try {
    if (showProgress) {
      console.log(
        `\n[${
          taskId || "IdealFSM-Agent"
        }] 开始为概念 "${concept}" 生成理想 FSM...\n`
      );
    }

    const stream = await callAIStream(model, userPrompt, systemPrompt, {
      temperature,
      response_format: { type: "json_object" },
    });

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
      console.log(`\n\n[${taskId || "IdealFSM-Agent"}] 理想 FSM 生成完成！\n`);
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

    // 直接解析 JSON
    let idealFsmData;
    try {
      idealFsmData = JSON.parse(cleanedContent);

      // 验证基本结构
      if (!idealFsmData.states || !Array.isArray(idealFsmData.states)) {
        console.log("理想 FSM 缺少 states 数组");
      }
      if (!idealFsmData.events || !Array.isArray(idealFsmData.events)) {
        console.log("理想 FSM 缺少 events 数组");
      }
      if (
        !idealFsmData.transitions ||
        !Array.isArray(idealFsmData.transitions)
      ) {
        console.log("理想 FSM 缺少 transitions 数组");
      }
      if (!idealFsmData.components || !Array.isArray(idealFsmData.components)) {
        console.log("理想 FSM 缺少 components 数组");
      }
    } catch (e) {
      idealFsmData = cleanedContent;
      console.error(
        `[${taskId || "IdealFSM-Agent"}] JSON 解析失败，但流程继续...`,
        e
      );
    }

    if (showProgress) {
      console.log(
        `[${taskId || "IdealFSM-Agent"}] 理想 FSM 验证通过: ${
          idealFsmData.states?.length || 0
        } 个状态, ${(idealFsmData.events || []).length} 个事件, ${
          (idealFsmData.transitions || []).length
        } 个转换, ${(idealFsmData.components || []).length} 个组件`
      );
    }

    return idealFsmData;
  } catch (err) {
    console.error(`[${taskId || "IdealFSM-Agent"}] 生成理想 FSM 时出错:`, err);
    throw err;
  }
}
