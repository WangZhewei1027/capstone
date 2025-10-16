# FSM to Playwright 测试生成器

这个工具可以从HTML文件中提取FSM配置并生成对应的Playwright测试。

## 使用方法

### 1. 基本用法

```bash
# 从单个HTML文件生成Playwright测试
node test.mjs <html-file-path>

# 示例
node test.mjs ./9-24/html/06754400-9905-11f0-a257-cdbaf9f86314.html
```

### 2. 运行生成的测试

```bash
# 安装Playwright浏览器（首次使用）
npx playwright install

# 运行所有测试
npm test

# 运行特定测试文件
npx playwright test test-results/06754400-9905-11f0-a257-cdbaf9f86314.spec.js

# 以有头模式运行（可以看到浏览器）
npm run test:headed

# 运行特定浏览器的测试
npx playwright test --project=chromium
```

### 3. 生成的测试包含

生成的Playwright测试包含以下内容：

- **状态验证测试**: 验证每个FSM状态的UI元素是否正确显示
- **事件触发测试**: 模拟用户交互（点击、输入等）并验证状态转换
- **完整用户流程测试**: 端到端的用户交互流程测试
- **截图和视频**: 失败时自动捕获截图和视频

### 4. 测试报告

运行测试后，可以查看详细报告：

```bash
# 生成HTML报告
npx playwright show-report
```

报告包含：
- 测试执行结果
- 失败时的截图
- 执行过程录像
- 性能指标

### 5. FSM配置要求

HTML文件需要包含有效的FSM配置，格式如下：

```javascript
window.fsmConfig = {
  concept: "概念名称",
  machine: {
    initial: "初始状态",
    states: {
      "状态1": {
        on: {
          "事件1": "目标状态"
        }
      }
    }
  },
  playwright: {
    selectors: {
      "元素名": "CSS选择器"
    },
    events: {
      "事件1": {
        selector: "CSS选择器",
        action: "click|type|hover",
        value: "输入值（仅type动作需要）"
      }
    },
    assertions: {
      "状态1": [
        {
          selector: "CSS选择器",
          type: "visible|hidden|text|class",
          value: "期望值",
          description: "断言描述"
        }
      ]
    }
  }
};
```

### 6. 常用命令

```bash
# 批量生成测试（处理整个工作空间）
for file in ./9-24/html/*.html; do node test.mjs "$file"; done

# 运行特定项目的测试
npx playwright test --project=webkit

# 调试模式运行测试
npx playwright test --debug

# 更新基准截图
npx playwright test --update-snapshots
```

### 7. 故障排除

如果遇到问题：

1. **找不到FSM配置**: 确保HTML文件包含`window.fsmConfig`对象
2. **选择器失效**: 检查CSS选择器是否正确
3. **测试超时**: 增加`playwright.config.js`中的timeout设置
4. **浏览器未安装**: 运行`npx playwright install`

### 8. 示例输出

成功运行后会看到：

```
📖 正在提取FSM配置...
✅ 成功提取FSM配置
📋 概念: Bubble Sort Algorithm
🔧 正在生成Playwright测试...
✅ Playwright测试已保存到: ./test-results/06754400-9905-11f0-a257-cdbaf9f86314.spec.js

📝 生成的测试包含:
   - 状态验证测试
   - 事件触发测试
   - 完整用户流程测试

🚀 运行测试命令:
   npx playwright test ./test-results/06754400-9905-11f0-a257-cdbaf9f86314.spec.js
```