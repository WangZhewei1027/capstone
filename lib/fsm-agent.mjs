import OpenAI from "openai";
import "dotenv/config";
import process from "node:process";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

/**
 * FSM Agent - 分析 HTML 代码并生成有限状态机定义
 * @param {string} htmlContent - 完整的 HTML 代码
 * @param {string} topic - 主题/概念名称
 * @param {object} options - 配置选项
 * @returns {Promise<object>} FSM JSON 对象
 */
export async function generateFSM(htmlContent, topic, options = {}) {
  const { showProgress = false, taskId = null, model = "gpt-4o" } = options;

  const systemPrompt = `You are an expert at analyzing interactive web applications and extracting finite state machines (FSM).

Your task is to:
1. Analyze the provided HTML/JavaScript code
2. Identify all interactive states the application can be in
3. Identify all events/actions that trigger state transitions
4. Identify any onEnter/onExit actions for each state
5. Generate a clean FSM definition in JSON format

The FSM should follow this structure:
{
  "topic": "Topic Name",
  "description": "Brief description of what the FSM models",
  "states": [
    {
      "name": "stateName",
      "onEnter": "actionName (optional)",
      "onExit": "actionName (optional)",
      "on": {
        "EVENT_NAME": "nextState"
      }
    }
  ],
  "events": ["EVENT1", "EVENT2", ...],
  "notes": "Additional implementation notes"
}

Focus on:
- Button clicks and user interactions
- Animation states
- Data loading/processing states
- Visual feedback states (comparing, swapping, highlighting, etc.)
- Completion/done states

Keep state names descriptive but concise (e.g., "idle", "comparing", "swapping", "playing", "paused", "done").
Event names should be UPPERCASE_WITH_UNDERSCORES.
Only respond with valid JSON, no markdown formatting or code blocks.`;

  const userPrompt = `Analyze this interactive HTML application and generate a finite state machine definition.

Topic: ${topic}

HTML Code:
${htmlContent}

Generate a comprehensive FSM that captures all the interactive states and transitions in this application.`;

  try {
    if (showProgress) {
      console.log(`\n[${taskId || "FSM-Agent"}] 开始分析 HTML 生成 FSM...\n`);
    }

    const stream = await client.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      model: model,
      stream: true,
      temperature: 0.3, // 降低温度以获得更一致的输出
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

    // 解析 JSON
    let fsmData;
    try {
      fsmData = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error(`[${taskId || "FSM-Agent"}] JSON 解析失败:`, parseError);
      console.error("原始内容:", cleanedContent.substring(0, 500));
      throw new Error(`FSM JSON 解析失败: ${parseError.message}`);
    }

    // 验证基本结构
    if (!fsmData.states || !Array.isArray(fsmData.states)) {
      throw new Error("FSM 缺少 states 数组");
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

/**
 * 将 FSM 对象转换为 HTML script 标签
 * @param {object} fsmData - FSM JSON 对象
 * @returns {string} HTML script 标签字符串
 */
export function fsmToScriptTag(fsmData) {
  const jsonString = JSON.stringify(fsmData, null, 2);
  return `\n\n  <script id="fsm" type="application/json">
    ${jsonString}
  </script>`;
}

/**
 * 在 HTML 的 </body> 标签前插入 FSM script
 * @param {string} htmlContent - 原始 HTML 内容
 * @param {object} fsmData - FSM JSON 对象
 * @returns {string} 更新后的 HTML
 */
export function insertFSMIntoHTML(htmlContent, fsmData) {
  const scriptTag = fsmToScriptTag(fsmData);

  // 查找 </body> 标签
  const bodyCloseTag = "</body>";
  const bodyCloseIndex = htmlContent.lastIndexOf(bodyCloseTag);

  if (bodyCloseIndex === -1) {
    // 如果没有 </body> 标签，添加到末尾
    return htmlContent + scriptTag + "\n</body>\n</html>";
  }

  // 在 </body> 前插入
  return (
    htmlContent.substring(0, bodyCloseIndex) +
    scriptTag +
    "\n" +
    htmlContent.substring(bodyCloseIndex)
  );
}
