import { exec } from "child_process";
import { promisify } from "util";
const run = promisify(exec);

import questionList from "./question-list.json" assert { type: "json" };

// 定义任务列表
const tasks = questionList.map((q) => ({
  model: "gpt-5",
  question: q,
}));

console.log(tasks);

const workspace = "10-05-0003";

const systemPrompt =
  "Generate a single HTML file with JavaScript demonstrating the user-given concept. Only respond in a single HTML file.";

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
