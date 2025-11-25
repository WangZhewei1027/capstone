import { generateHTML } from "./html-agent.mjs";

async function main() {
  await generateHTML(
    "meta-llama/Llama-3.2-1B-Instruct",
    "创建一个包含按钮和文本的简单交互式网页，点击按钮时文本内容会改变。",
    null,
    { showProgress: true, taskId: "Test-HTML-Agent" }
  );
}

main();
