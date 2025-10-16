import { extractFSMFromFile } from "./fsm-extractor.js";
import { promises as fs } from "fs";
import path from "path";

/**
 * 将FSM配置转换为Playwright测试代码
 * @param {Object} fsmConfig - FSM配置对象
 * @param {string} htmlFilePath - HTML文件路径
 * @returns {string} Playwright测试代码
 */
function generatePlaywrightTest(fsmConfig, htmlFilePath) {
  if (!fsmConfig || !fsmConfig.machine || !fsmConfig.playwright) {
    throw new Error("FSM配置不完整，缺少machine或playwright配置");
  }

  const { machine, playwright, concept } = fsmConfig;
  const { selectors, events, assertions } = playwright;

  // 获取HTML文件的相对路径
  const htmlFileName = path.basename(htmlFilePath);

  let testCode = `import { test, expect } from '@playwright/test';

// 测试概念: ${concept || "Unknown"}
// 生成时间: ${new Date().toISOString()}

test.describe('${concept || "FSM Test"}', () => {
  test.beforeEach(async ({ page }) => {
    // 导航到HTML文件
    await page.goto('file://${htmlFilePath}');
    
    // 等待页面加载完成
    await page.waitForLoadState('networkidle');
  });

`;

  // 为每个状态生成测试用例
  const states = machine.states || {};

  Object.keys(states).forEach((stateName) => {
    const state = states[stateName];

    testCode += `  test('状态: ${stateName}', async ({ page }) => {
`;

    // 添加状态断言
    if (assertions && assertions[stateName]) {
      const stateAssertions = assertions[stateName];

      if (Array.isArray(stateAssertions)) {
        stateAssertions.forEach((assertion) => {
          testCode += `    // 断言: ${assertion.description || "检查状态"}
`;
          if (assertion.selector && assertion.type) {
            switch (assertion.type) {
              case "visible":
                testCode += `    await expect(page.locator('${assertion.selector}')).toBeVisible();
`;
                break;
              case "hidden":
                testCode += `    await expect(page.locator('${assertion.selector}')).toBeHidden();
`;
                break;
              case "text":
                testCode += `    await expect(page.locator('${assertion.selector}')).toHaveText('${assertion.value}');
`;
                break;
              case "textEquals":
                testCode += `    await expect(page.locator('${assertion.selector}')).toHaveText('${assertion.value}');
`;
                break;
              case "class":
                testCode += `    await expect(page.locator('${assertion.selector}')).toHaveClass(/${assertion.value}/);
`;
                break;
              case "hasAttribute":
                testCode += `    await expect(page.locator('${assertion.selector}')).toHaveAttribute('${assertion.name}', '${assertion.value}');
`;
                break;
              case "textEqualsSelector":
                testCode += `    const text1 = await page.locator('${assertion.selectorA}').textContent();
    const text2 = await page.locator('${assertion.selectorB}').textContent();
    expect(text1).toBe(text2);
`;
                break;
              default:
                testCode += `    // 未识别的断言类型: ${assertion.type}
`;
            }
          }
        });
      }
    }

    // 添加状态转换测试
    if (state.on) {
      Object.keys(state.on).forEach((eventName) => {
        const transition = state.on[eventName];
        const targetState =
          typeof transition === "string" ? transition : transition.target;

        if (events && events[eventName]) {
          const eventConfig = events[eventName];

          testCode += `
    // 事件触发: ${eventName} -> ${targetState}
`;

          if (eventConfig.selector && eventConfig.type) {
            switch (eventConfig.type) {
              case "click":
                testCode += `    await page.locator('${eventConfig.selector}').click();
`;
                break;
              case "type":
                testCode += `    await page.locator('${
                  eventConfig.selector
                }').fill('${eventConfig.value || "test"}');
`;
                break;
              case "hover":
                testCode += `    await page.locator('${eventConfig.selector}').hover();
`;
                break;
              default:
                testCode += `    // 未识别的动作类型: ${eventConfig.type}
`;
            }
          } else if (eventConfig.selector && eventConfig.action) {
            switch (eventConfig.action) {
              case "click":
                testCode += `    await page.locator('${eventConfig.selector}').click();
`;
                break;
              case "type":
                testCode += `    await page.locator('${
                  eventConfig.selector
                }').fill('${eventConfig.value || "test"}');
`;
                break;
              case "hover":
                testCode += `    await page.locator('${eventConfig.selector}').hover();
`;
                break;
              default:
                testCode += `    // 未识别的动作类型: ${eventConfig.action}
`;
            }
          }

          // 验证状态转换后的断言
          if (assertions && assertions[targetState]) {
            testCode += `    
    // 验证转换到状态: ${targetState}
`;
            const targetAssertions = assertions[targetState];
            if (Array.isArray(targetAssertions)) {
              targetAssertions.slice(0, 2).forEach((assertion) => {
                // 只取前2个断言避免代码过长
                if (assertion.selector && assertion.type === "visible") {
                  testCode += `    await expect(page.locator('${assertion.selector}')).toBeVisible();
`;
                }
              });
            }
          }
        }
      });
    }

    testCode += `  });

`;
  });

  // 添加完整的用户流程测试
  testCode += `  test('完整用户流程', async ({ page }) => {
    // 从初始状态开始
    const initialState = '${machine.initial || "initial"}';
    
`;

  // 生成一个基本的用户流程
  if (events) {
    const eventKeys = Object.keys(events).slice(0, 3); // 限制为前3个事件
    eventKeys.forEach((eventName, index) => {
      const event = events[eventName];
      testCode += `    // 步骤 ${index + 1}: 触发事件 ${eventName}
`;
      if (event.selector && event.type) {
        switch (event.type) {
          case "click":
            testCode += `    await page.locator('${event.selector}').click();
    await page.waitForTimeout(500); // 等待动画完成
`;
            break;
          case "type":
            testCode += `    await page.locator('${event.selector}').fill('${
              event.value || "test input"
            }');
`;
            break;
        }
      } else if (event.selector && event.action) {
        switch (event.action) {
          case "click":
            testCode += `    await page.locator('${event.selector}').click();
    await page.waitForTimeout(500); // 等待动画完成
`;
            break;
          case "type":
            testCode += `    await page.locator('${event.selector}').fill('${
              event.value || "test input"
            }');
`;
            break;
        }
      }
    });
  }

  testCode += `    
    // 截图以供调试
    await page.screenshot({ path: 'test-results/${
      concept || "fsm"
    }-final-state.png' });
  });

});
`;

  return testCode;
}

/**
 * 保存Playwright测试到文件
 * @param {string} testCode - 测试代码
 * @param {string} outputPath - 输出文件路径
 */
async function savePlaywrightTest(testCode, outputPath) {
  try {
    // 确保输出目录存在
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });

    // 写入测试文件
    await fs.writeFile(outputPath, testCode, "utf-8");
    console.log(`✅ Playwright测试已保存到: ${outputPath}`);
  } catch (error) {
    console.error("保存测试文件失败:", error);
    throw error;
  }
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("请提供HTML文件路径作为参数");
    console.error("用法: node test.mjs <html-file-path>");
    process.exit(1);
  }

  try {
    // 提取FSM配置
    console.log("📖 正在提取FSM配置...");
    const fsm_result = await extractFSMFromFile(filePath);

    if (!fsm_result) {
      console.log("❌ 未能提取FSM配置");
      return;
    }

    console.log("✅ 成功提取FSM配置");
    console.log("📋 概念:", fsm_result.concept || "Unknown");

    // 生成Playwright测试
    console.log("🔧 正在生成Playwright测试...");
    const testCode = generatePlaywrightTest(fsm_result, path.resolve(filePath));

    // 生成输出文件名
    const baseName = path.basename(filePath, ".html");
    const outputPath = `./test-results/${baseName}.spec.js`;

    // 保存测试文件
    await savePlaywrightTest(testCode, outputPath);

    console.log("\n📝 生成的测试包含:");
    console.log("   - 状态验证测试");
    console.log("   - 事件触发测试");
    console.log("   - 完整用户流程测试");

    console.log("\n🚀 运行测试命令:");
    console.log(`   npx playwright test ${outputPath}`);
  } catch (error) {
    console.error("❌ 处理过程中出错:", error);
    process.exit(1);
  }
}

main();
