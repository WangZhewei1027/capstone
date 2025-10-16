import { exec } from "child_process";
import { promisify } from "util";
const run = promisify(exec);

import questionList from "./question-list.json" assert { type: "json" };

// 定义任务列表
// const tasks = questionList.map((q) => ({
//   model: "gpt-5",
//   question: q,
// }));

const workspace = "10-14-0001";

const systemPrompt =
  "You are an expert in interactive web design and front-end pedagogy. batOnly respond in a single HTML file.";

const concept = "bubble sort";

const question = `
You are an expert in interactive web design and front-end pedagogy. Please design a **high-quality interactive HTML page** that provides an in-depth, hands-on exploration of ${concept}.

**Project Overview:**
Topic: ${concept}  

**Interactive Design Plan:**

Please plan the HTML interface as a **single interactive module** that teaches or demonstrates this concept.

For this module, include the following sections:

*   **Concept Title:** A concise title describing the main idea.
*   **Learning Objective:** What users should understand or experience after interacting with the module.
*   **Interaction Design:** Describe in detail how the user interacts with the page (clicking, dragging, typing, etc.), what changes occur in response (animations, visual updates, state changes), and how these reinforce understanding of the concept.
*   **Layout Description:** Explain the spatial organization — placement of text, controls, and visuals — including how you will maintain clarity, focus, and balance.  
    - Safe area margins: **24 px** on all sides of the viewport.  
    - Minimum spacing: **16 px** between any two interactive elements.  
    - Ensure accessibility and responsiveness.

**Requirements:**
1. The design should explain **only one concept** clearly and interactively.  
2. The page must include **at least one form of visual feedback or animation** responding to user input.  
3. The implementation must be **self-contained** — using only vanilla HTML, CSS, and JavaScript (no external libraries or assets).  
4. Maintain consistent code formatting and indentation.`;

const tasks = [
  {
    model: "gpt-4o",
    question: question,
  },
];

console.log(tasks);

// 循环执行
for (const task of tasks) {
  const cmd = `node add.mjs --workspace "${workspace}" --model "${task.model}" --question "${task.question}" --system "${systemPrompt}"`;
  console.log(`执行任务: ${cmd}`);
  try {
    const { stdout, stderr } = await run(cmd);
    console.log(stdout);
    if (stderr) console.error(stderr);
  } catch (err) {
    console.error("出错：", err);
  }
}
