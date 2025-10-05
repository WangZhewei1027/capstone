import { exec } from "child_process";
import { promisify } from "util";
const run = promisify(exec);

// 定义任务列表
const tasks = [
  { workspace: "10-04-0003", model: "gpt-4o-mini", question: "bubble sort" },
  { workspace: "10-04-0003", model: "gpt-4o-mini", question: "quick sort" },
  {
    workspace: "10-04-0003",
    model: "gpt-4o-mini",
    question: "linked list demo",
  },
];

// 循环执行
for (const task of tasks) {
  const cmd = `node add.mjs --workspace "${task.workspace}" --model "${task.model}" --question "${task.question}" --system "Generate a single HTML file with JavaScript demonstrating the user-given concept. Only respond in a single HTML file."`;
  console.log(`执行任务: ${cmd}`);
  try {
    const { stdout, stderr } = await run(cmd);
    console.log(stdout);
    if (stderr) console.error(stderr);
  } catch (err) {
    console.error("出错：", err);
  }
}
