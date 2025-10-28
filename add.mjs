import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import process from "node:process";
import { processTask, modelList } from "./lib/add-core.mjs";

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    workspace: null,
    model: null,
    question: null,
    system: null,
    topic: null,
    enableFSM: true, // 默认启用 FSM
    enableTests: false, // 默认禁用测试生成
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--workspace":
      case "-w":
        parsed.workspace = args[++i];
        break;
      case "--model":
      case "-m":
        parsed.model = args[++i];
        break;
      case "--question":
      case "-q":
        parsed.question = args[++i];
        break;
      case "--system":
      case "-s":
        parsed.system = args[++i];
        break;
      case "--topic":
      case "-t":
        parsed.topic = args[++i];
        break;
      case "--no-fsm":
        parsed.enableFSM = false;
        break;
      case "--enable-tests":
        parsed.enableTests = true;
        break;
      case "--help":
      case "-h":
        parsed.help = true;
        break;
      default:
        if (!arg.startsWith("--") && !arg.startsWith("-")) {
          // 如果没有指定参数，将第一个非选项参数作为问题
          if (!parsed.question) {
            parsed.question = arg;
          }
        }
        break;
    }
  }

  return parsed;
}

// 显示帮助信息
function showHelp() {
  console.log(`
使用方法: node add.mjs [选项]

选项:
  -w, --workspace <name>    指定工作空间名称
  -m, --model <model>       指定模型名称或编号
  -q, --question <text>     指定问题内容
  -s, --system <text>       指定系统提示词
  -t, --topic <text>        指定主题（用于 FSM 和测试生成）
  --no-fsm                  禁用 FSM 生成（默认启用）
  --enable-tests            启用 Playwright 测试生成（需要启用 FSM）
  -h, --help               显示此帮助信息

示例:
  node add.mjs --workspace "10-04" --model "gpt-4o-mini" --question "创建一个冒泡排序演示" --topic "冒泡排序"
  node add.mjs -w "test" -m 1 -q "制作一个计算器" -t "计算器" --enable-tests
  node add.mjs "创建一个时钟" --no-fsm (禁用 FSM 生成)

多 Agent 模式:
  默认启用两个 Agent：
  1. HTML 生成 Agent - 生成交互式 HTML 页面
  2. FSM 生成 Agent - 分析 HTML 并生成有限状态机定义
  
  使用 --enable-tests 可启用第三个 Agent：
  3. Playwright 测试生成 Agent - 基于 FSM 生成端到端测试

可用模型:
${modelList.map((model, index) => `  ${index + 1}. ${model}`).join("\n")}
`);
}

async function userInput(query) {
  const rl = createInterface({ input, output });
  try {
    return await rl.question(query);
  } finally {
    rl.close();
  }
}

async function selectModel(preSelectedModel = null) {
  // 如果通过参数预选择了模型
  if (preSelectedModel) {
    // 检查是否是数字（模型编号）
    const modelNumber = parseInt(preSelectedModel);
    if (
      !isNaN(modelNumber) &&
      modelNumber >= 1 &&
      modelNumber <= modelList.length
    ) {
      const selectedModel = modelList[modelNumber - 1];
      console.log(`已选择模型: ${selectedModel}\n`);
      return selectedModel;
    }

    // 检查是否是模型名称
    if (modelList.includes(preSelectedModel)) {
      console.log(`已选择模型: ${preSelectedModel}\n`);
      return preSelectedModel;
    }

    console.log(`警告: 未找到模型 "${preSelectedModel}"，将显示选择列表`);
  }

  console.log("\n可用的模型列表：");
  modelList.forEach((model, index) => {
    console.log(`${index + 1}. ${model}`);
  });

  while (true) {
    try {
      const input = await userInput(
        "请选择模型 (输入数字1-" + modelList.length + "): "
      );
      const choice = parseInt(input.trim());

      if (isNaN(choice) || choice < 1 || choice > modelList.length) {
        console.log("无效选择，请输入1到" + modelList.length + "之间的数字");
        continue;
      }

      const selectedModel = modelList[choice - 1];
      console.log(`已选择模型: ${selectedModel}\n`);
      return selectedModel;
    } catch (err) {
      console.error("选择模型时出错：", err);
      throw err;
    }
  }
}

let workspace = "default";

async function main() {
  const args = parseArgs();

  // 显示帮助信息
  if (args.help) {
    showHelp();
    return;
  }

  // 获取工作空间
  let workspace;
  if (args.workspace) {
    workspace = args.workspace;
    console.log(`使用工作空间: ${workspace}`);
  } else {
    workspace = await userInput("请输入工作空间: ");
  }

  // 选择模型
  let selectedModel;
  try {
    selectedModel = await selectModel(args.model);
  } catch (err) {
    console.error("选择模型时出错：", err);
    return;
  }

  // 获取系统提示
  let systemPrompt;
  try {
    if (args.system) {
      systemPrompt = args.system;
      console.log(`使用系统提示: ${systemPrompt}`);
    } else {
      const systemInput = await userInput(
        "请输入系统提示 (直接回车使用默认): "
      );
      systemPrompt = systemInput.trim() || null;
      if (systemPrompt) {
        console.log(`使用自定义系统提示: ${systemPrompt}`);
      } else {
        console.log("使用默认系统提示");
      }
    }
  } catch (err) {
    console.error("获取系统提示时出错：", err);
    return;
  }

  // 获取用户问题
  let question;
  try {
    if (args.question) {
      question = args.question;
      console.log(`使用问题: ${question}`);
    } else {
      question = await userInput("请输入提问内容: ");
    }
  } catch (err) {
    console.error("获取用户输入时出错：", err);
    return;
  }

  // 获取主题（用于 FSM）
  let topic = args.topic;
  if (!topic && args.enableFSM) {
    try {
      const topicInput = await userInput(
        "请输入主题/概念名称 (用于 FSM 生成，直接回车跳过): "
      );
      topic = topicInput.trim() || null;
    } catch (err) {
      console.error("获取主题时出错：", err);
    }
  }

  // 显示配置
  console.log("\n配置信息:");
  console.log(`- 工作空间: ${workspace}`);
  console.log(`- 模型: ${selectedModel}`);
  console.log(`- FSM 生成: ${args.enableFSM ? "启用" : "禁用"}`);
  console.log(`- 测试生成: ${args.enableTests ? "启用" : "禁用"}`);
  if (topic) {
    console.log(`- 主题: ${topic}`);
  }
  console.log("");

  // 构建任务对象
  const task = {
    workspace: workspace,
    model: selectedModel,
    question: question,
    system: systemPrompt,
    topic: topic,
  };

  try {
    console.log("正在生成，请稍候...");
    const result = await processTask(task, {
      showProgress: true,
      enableFSM: args.enableFSM,
      enableTests: args.enableTests,
    });

    if (result.success) {
      console.log("\n内容生成成功!");
      if (result.hasFSM) {
        console.log("✓ HTML 文件已生成（包含 FSM）");
      } else {
        console.log("✓ HTML 文件已生成");
      }
      console.log("\n打开下面的链接查看效果：");
      console.log(result.url);
    } else {
      console.error("任务执行失败：", result.error);
    }
  } catch (err) {
    console.error("执行任务时出错：", err);
  }
}

main();
