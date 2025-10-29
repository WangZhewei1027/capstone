#!/usr/bin/env node
/**
 * 测试API图片理解能力
 * 基于analyze-visual.mjs的成功格式
 */

import fs from "fs/promises";
import path from "path";
import OpenAI from "openai";
import "dotenv/config";

// 使用与analyze-visual.mjs相同的配置
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

const MODEL = "gpt-4o-mini";

// 读取图片并转换为base64数据URI
async function readImageAsDataURI(filePath) {
  const data = await fs.readFile(filePath);
  return `data:image/png;base64,${data.toString("base64")}`;
}

// 使用正确的API格式发送请求
async function testImageAnalysis(imageDataUri) {
  console.log("📤 发送API请求...");

  const instructionText = `请详细分析这张图片的内容。这是一个交互式的网页应用截图。请描述：
1. 应用的标题和主要功能
2. 界面布局和设计元素
3. 可见的交互控件（按钮、输入框等）
4. 数据可视化部分（如果有的话）
5. 整体的用户体验设计质量

请用中文回答，格式清晰。`;

  const input = [
    {
      role: "user",
      content: [
        { type: "input_text", text: instructionText },
        { type: "input_image", image_url: imageDataUri },
      ],
    },
  ];

  try {
    // 使用与analyze-visual.mjs相同的API调用方式
    const response = await client.responses.create({
      model: MODEL,
      input,
    });

    return response;
  } catch (error) {
    console.error("❌ API调用失败:", error);
    throw error;
  }
}

// 解析API响应
function extractTextFromResponse(resp) {
  try {
    let combinedText = "";

    if (Array.isArray(resp.output)) {
      for (const out of resp.output) {
        if (out.content && Array.isArray(out.content)) {
          for (const c of out.content) {
            if (c.type === "output_text" && c.text) {
              combinedText += c.text + "\n";
            }
          }
        }
      }
    }

    return combinedText.trim() || "无法解析响应内容";
  } catch (err) {
    return `解析错误: ${err.message}`;
  }
}

async function main() {
  console.log("🖼️  测试API图片理解能力\n");

  // 检查环境变量
  if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_BASE_URL) {
    console.log("❌ 请先设置环境变量:");
    console.log("   export OPENAI_API_KEY=your-api-key");
    console.log("   export OPENAI_BASE_URL=https://turingai.plus/v1/");
    return;
  }

  console.log(`✅ API配置: ${process.env.OPENAI_BASE_URL}`);

  // 使用BST截图进行测试
  const screenshotPath = path.resolve(
    "./workspace/vlm-test/visuals/4ca11ad0-b408-11f0-ab52-fbe7249bf639/01_idle_initial.png"
  );

  try {
    // 检查文件是否存在
    await fs.access(screenshotPath);
    console.log(`📸 使用截图: ${path.basename(screenshotPath)}`);
  } catch (error) {
    console.error(`❌ 截图文件不存在: ${screenshotPath}`);
    console.log("\n💡 请确保以下路径存在截图文件:");
    console.log(
      "   ./workspace/vlm-test/visuals/4ca11ad0-b408-11f0-ab52-fbe7249bf639/01_idle_initial.png"
    );
    return;
  }

  try {
    // 1. 读取图片
    console.log("\n📖 读取图片文件...");
    const imageDataUri = await readImageAsDataURI(screenshotPath);
    console.log(`✅ 图片已转换为base64，长度: ${imageDataUri.length}`);

    // 2. 发送API请求
    console.log("\n🧠 调用API分析图片...");
    const startTime = Date.now();

    const apiResponse = await testImageAnalysis(imageDataUri);

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log(`✅ API调用成功，耗时: ${duration}秒`);

    // 3. 解析并显示结果
    console.log("\n📝 API分析结果:");
    console.log("=" * 50);

    const analysisText = extractTextFromResponse(apiResponse);
    console.log(analysisText);

    console.log("=" * 50);

    // 4. 保存详细响应（用于调试）
    const debugPath = "./test-image-analysis-debug.json";
    await fs.writeFile(
      debugPath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          screenshotPath,
          request: {
            model: MODEL,
            imageDataUriLength: imageDataUri.length,
          },
          response: apiResponse,
          parsedText: analysisText,
        },
        null,
        2
      ),
      "utf-8"
    );

    console.log(`\n💾 详细响应已保存到: ${debugPath}`);
    console.log("\n🎉 测试成功！API能够理解并分析图片内容。");

    // 显示一些统计信息
    if (apiResponse.usage) {
      console.log("\n📊 Token使用统计:");
      console.log(`   输入tokens: ${apiResponse.usage.input_tokens || 0}`);
      console.log(`   输出tokens: ${apiResponse.usage.output_tokens || 0}`);
      console.log(`   总计tokens: ${apiResponse.usage.total_tokens || 0}`);
    }
  } catch (error) {
    console.error("\n❌ 测试失败:");
    console.error(`   错误类型: ${error.constructor.name}`);
    console.error(`   错误信息: ${error.message}`);

    if (error.response) {
      console.error(`   HTTP状态: ${error.response.status}`);
      if (error.response.data) {
        console.error(
          `   响应详情: ${JSON.stringify(error.response.data, null, 2)}`
        );
      }
    }

    console.log("\n🔧 故障排除建议:");
    console.log("   1. 确认API Key有效且有足够额度");
    console.log("   2. 检查API服务器是否支持图片分析");
    console.log("   3. 验证图片文件格式和大小是否合适");
    console.log("   4. 检查网络连接状态");
  }
}

// 运行测试
main().catch(console.error);
