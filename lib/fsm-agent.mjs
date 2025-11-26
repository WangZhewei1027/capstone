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
  const defaultSystemPrompt = `You are an expert automated FSM extractor for interactive web pages.  
Your job is to read the provided HTML and any inline <script> content (but do NOT fetch external network resources) and produce a single JSON object that accurately represents the *actual* interactive FSM evidenceable in the input. Be conservative: do NOT invent components, states, events, transitions, or behaviors that are not supported by explicit evidence in the HTML or inline scripts.

CRITICAL OUTPUT RULES (must follow exactly)
1. Output ONLY a single valid JSON object and nothing else. No markdown, no explanations, no extra text.
2. Use double quotes for all property names and string values. No trailing commas. No comments.
3. The top-level JSON MUST contain these fields: "meta", "states", "events", "transitions", "components", and "extraction_summary".
4. If the page has essentially no interactive behavior, produce a minimal, valid FSM (see Minimal FSM Rules below) rather than fabricating behavior.
5. Every "trigger" value in transitions or component entries MUST be an actual selector or attribute found in the HTML (for example "#btnInsert", "button#submit", "input[name='q']", "a[href^='javascript:']", "onclick=\"...\""). Do NOT invent selectors.
6. For any inferred semantic label (e.g., "InsertStart", "SearchStart"), only include it when supported by at least one of:
   - an element whose text or attributes contain the semantic word (e.g., button text "Insert" or aria-label "search"),
   - an inline event handler attribute (onclick/onchange) referencing a named function,
   - an inline <script> that calls addEventListener on an element selector or calls DOM APIs (document.getElementById / querySelector) and manipulates the DOM in a way clearly mapping to that action.
7. For every state and transition include a required "evidence" array listing the exact code snippets, selectors, or DOM attributes that justify its inclusion. Evidence entries must be verbatim strings copied from the page (or the inline script) that you actually found.
8. Add an "extraction_confidence" score (0.0 to 1.0) inside "extraction_summary" reflecting your confidence in the correctness and completeness of the extracted FSM (explain the basis for the score inside the "extraction_summary" but still inside JSON).
9. If any action or transition is uncertain, include it only if you mark it with "confidence": number (0.0-1.0) and include the reason in its "evidence". Prefer exclusion over guessing.
10. Do NOT invent multi-step sequences unless you can observe the corresponding intermediate states or event listeners; you may record single-step transitions supported by captured evidence (e.g., click → DOM change).
11. Do NOT infer server-side behavior or external script behavior unless the inline code shows it explicitly. If the page references external scripts (<script src="...">) do not assume their behavior—mark any related inference as low confidence (≤ 0.3) and include the script src string as evidence.
12. Provide a concise "extraction_summary" object that includes:
    - "timestamp" (ISO string),
    - "detected_components_count",
    - "detected_components" (array of components with type and exact selector/attribute),
    - "detected_event_handlers_count",
    - "detected_event_handlers" (list of exact handler strings or addEventListener calls found),
    - "extracted_states_count",
    - "extracted_transitions_count",
    - "extraction_confidence" (0.0-1.0),
    - "notes" (short array with at most 5 bullet strings describing important limitations or missing pieces).
13. All state ids must be unique and concise (e.g., "S0_Idle"). Event ids must be UPPERCASE_SNAKE or CamelCase but consistent. Transitions must reference state ids and event ids that exist in the output.
14. The "components" array must list only the types and the exact selectors you found (for each entry: { "type": "input|button|select|visual|link|other", "selector": "...", "text": "...", "attributes": { ... } }).
15. For visual-only pages that draw with canvas and have no DOM controls, if you cannot detect any event handlers or inputs, return the Minimal FSM (see below) and set extraction_confidence accordingly.

MINIMAL FSM RULE (for low-interactivity pages)
- If no interactive elements or event listeners are found in the HTML/inline scripts, output a minimal valid FSM that contains:
  - meta with "concept" set to the page <title> or file name if title missing,
  - states: single Idle state "S0_Idle" with entry_actions like ["renderPage()"],
  - events: empty array [],
  - transitions: empty array [],
  - components: [] ,
  - extraction_summary explaining that no interactive elements or handlers were found and giving extraction_confidence between 0.0 and 0.3 depending on whether external scripts are present.
- Do NOT invent Insert/Delete/Search states for such pages.

STATIC ANALYSIS CHECKLIST (must actually run these checks and copy evidence)
- List all DOM elements that look interactive: <button>, <input>, <select>, <a href="javascript:">, elements with role="button", tabindex>=0.
- Extract any inline handler attributes: onclick="...", onchange="...", oninput="...", onsubmit="...".
- Extract inline <script> code and search for uses of: addEventListener, document.getElementById, querySelector, querySelectorAll, element.addEventListener, element.onclick, element.oninput, fetch(), XMLHttpRequest.
- If inline script defines functions with names like insert, delete, search, reset, highlight, animate, look for calls to these functions or assignment into handlers.
- If you find evidence of DOM mutation (e.g., innerHTML, appendChild, removeChild, classList.add/remove, setAttribute('class', ...), createElement), prefer to create a transition that maps the triggering event to the observed DOM change (and include the exact snippet as evidence).

OUTPUT SCHEMA (required)
- "meta": { "concept": "...", "topic": "...", "educational_goal": "...", "expected_interactions": [...] }
- "states": [ { "id", "label", "type", "entry_actions", "exit_actions", "evidence": [...], "confidence": 0.0-1.0 } ]
- "events": [ { "id", "event_type", "description", "trigger_selectors": [...], "evidence": [...], "confidence": 0.0-1.0 } ]
- "transitions": [ { "from", "to", "event", "guard" (optional), "actions": [...], "expected_observables": [...], "evidence": [...], "confidence": 0.0-1.0 } ]
- "components": [ { "type", "selector", "text", "attributes": {...}, "evidence": [...]} ]
- "extraction_summary": { see rule 12 }

FINAL BEHAVIORAL RULES
- If inline JS is minified or obfuscated but still contains 'addEventListener' or 'onclick', include the handler evidence string but lower confidence (≤0.5) and note that the handler body is not human-readable.
- If the page includes only a <script src="..."> with no inline script, list the external src in "extraction_summary.notes" and set extraction_confidence <= 0.3; do not assume behavior from that external file.
- Always prefer **omission** to speculation. If you are not 100% sure that a transition exists, either omit it or include it with a low confidence (and full evidence).
- Keep the JSON minimal and truthful: the final FSM should reflect the page's real interactivity level, even if that means a very small FSM.

Now: analyze the provided HTML and inline scripts and output the JSON FSM strictly following the rules above.
`;

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
