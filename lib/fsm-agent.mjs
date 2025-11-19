import OpenAI from "openai";
import "dotenv/config";
import process from "node:process";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

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
5. Extract actual DOM selectors for each interactive element
6. Generate a clean FSM definition in JSON format

CRITICAL: You must output ONLY valid JSON. No markdown, no code blocks, no explanations.

The FSM should follow this structure:
{
  "topic": "Topic Name",
  "description": "Brief description of what the FSM models",
  "states": [
    {
      "name": "idle",
      "onEnter": "noop",
      "onExit": "noop",
      "on": {
        "START_CLICKED": "running",
        "RESET_CLICKED": "idle"
      }
    },
    {
      "name": "running", 
      "onEnter": "startAnimation",
      "onExit": "noop",
      "on": {
        "PAUSE_CLICKED": "paused",
        "STOP_CLICKED": "idle",
        "COMPLETE": "done"
      }
    }
  ],
  "events": ["START_CLICKED", "PAUSE_CLICKED", "STOP_CLICKED", "RESET_CLICKED", "COMPLETE"],
  "triggers": {
    "START_CLICKED": "#start-button, #play-button, .start-btn",
    "PAUSE_CLICKED": "#pause-button, .pause-btn", 
    "STOP_CLICKED": "#stop-button, .stop-btn",
    "RESET_CLICKED": "#reset-button, .reset-btn"
  },
  "notes": "triggers field maps events to actual DOM selectors found in HTML"
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

  const userPrompt = `Analyze this interactive HTML application and generate a finite state machine definition.

Topic: ${topic}

HTML Code (CSS removed to save tokens):
${preprocessHtmlContent(htmlContent)}

CRITICAL REQUIREMENTS:
1. Extract ALL button IDs, classes, and selectors from the HTML
2. Map each event to the exact DOM selectors found  
3. Include all possible state transitions based on the interactive elements
4. Generate comprehensive FSM that captures all the interactive states and transitions in this application.`;

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
      temperature: 0.3,
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
