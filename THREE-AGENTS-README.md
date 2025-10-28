# 三个 Agent 系统 - 完整文档

## 系统架构

这是一个强大的三阶段 AI Agent 系统，用于自动生成交互式网页、提取有限状态机（FSM）并生成端到端测试：

```
用户提示
   ↓
┌─────────────────────────────────────────────────────┐
│ Agent 1: HTML 生成器                                 │
│ - 生成完整的交互式 HTML 页面                          │
│ - 使用 OpenAI 流式输出                                │
└─────────────────────────────────────────────────────┘
   ↓ (HTML 内容)
┌─────────────────────────────────────────────────────┐
│ Agent 2: FSM 提取器                                  │
│ - 分析 HTML 中的交互行为                              │
│ - 生成 FSM JSON 定义                                 │
│ - 将 FSM 嵌入 HTML <script> 标签                     │
└─────────────────────────────────────────────────────┘
   ↓ (HTML + FSM)
┌─────────────────────────────────────────────────────┐
│ Agent 3: Playwright 测试生成器                       │
│ - 基于 FSM 生成完整的 E2E 测试                        │
│ - 覆盖所有状态和转换                                  │
│ - 生成可执行的 .spec.js 文件                         │
└─────────────────────────────────────────────────────┘
   ↓
输出文件:
  - workspace/{name}/html/{uuid}.html
  - workspace/{name}/tests/{uuid}-{topic}.spec.js
  - workspace/{name}/data/data.json
```

## 核心模块

### 1. `lib/add-core.mjs`
主要的编排模块，管理整个三阶段流程。

**核心函数:**
- `chatWithOpenAI()` - OpenAI 流式对话
- `processTask()` - 三阶段任务处理
- `saveResult()` - 结果持久化

**processTask 选项:**
```javascript
{
  showProgress: true,      // 显示详细进度
  taskId: "TASK-1",       // 任务标识符
  enableFSM: true,        // 启用 FSM 生成
  enableTests: false      // 启用测试生成（需要 enableFSM）
}
```

### 2. `lib/fsm-agent.mjs`
FSM 提取和嵌入模块。

**核心函数:**
- `generateFSM(htmlContent, topic, options)` - 从 HTML 生成 FSM
- `insertFSMIntoHTML(htmlContent, fsmData)` - 将 FSM 插入 HTML
- `fsmToScriptTag(fsmData)` - FSM 转 script 标签

**FSM 格式:**
```json
{
  "topic": "Counter Application",
  "description": "FSM 描述",
  "states": [
    {
      "name": "idle",
      "on": {
        "EVENT_NAME": "target_state"
      }
    }
  ],
  "events": ["EVENT_1", "EVENT_2"]
}
```

### 3. `lib/playwright-agent.mjs`
Playwright 测试生成模块。

**核心函数:**
- `generatePlaywrightTest(fsmData, htmlContent, resultId, options)` - 生成测试
- `generateTestFileName(resultId, topic)` - 生成测试文件名

**生成的测试特点:**
- 覆盖所有 FSM 状态
- 测试所有状态转换
- 包含初始状态验证
- 添加边界条件测试
- 完整的 Playwright API 使用

### 4. `lib/concurrent-file-writer.mjs`
并发安全的文件写入器。

**核心功能:**
- 队列化写入操作
- 防止并发冲突
- 支持 JSON 追加

### 5. `lib/concurrency-limiter.mjs`
并发任务控制器。

**用法:**
```javascript
const limiter = new ConcurrencyLimiter(3); // 最多 3 个并发任务

tasks.forEach(task => {
  limiter.add(async () => {
    return await processTask(task);
  });
});
```

## 命令行工具

### `add.mjs` - 单任务执行

**基本用法:**
```bash
node add.mjs --workspace "test" --model "gpt-4o-mini" \
  --question "创建一个计数器" --topic "计数器"
```

**所有选项:**
```bash
node add.mjs [选项]

选项:
  -w, --workspace <name>    工作空间名称
  -m, --model <model>       模型名称或编号
  -q, --question <text>     问题内容
  -s, --system <text>       系统提示词
  -t, --topic <text>        主题（用于 FSM 和测试）
  --no-fsm                  禁用 FSM 生成
  --enable-tests            启用测试生成
  -h, --help               显示帮助
```

**示例:**

1. **完整流程（三个 Agent）:**
```bash
node add.mjs -w "demo" -m "gpt-4o-mini" \
  -q "创建冒泡排序可视化" -t "冒泡排序" --enable-tests
```

2. **仅 HTML + FSM（两个 Agent）:**
```bash
node add.mjs -w "demo" -m "gpt-4o" \
  -q "创建计算器" -t "计算器"
```

3. **仅 HTML（一个 Agent）:**
```bash
node add.mjs -w "demo" -m "gpt-4o-mini" \
  -q "创建时钟" --no-fsm
```

### `batch-add.mjs` - 批量并发执行

**配置:**
```javascript
const CONFIG = {
  workspace: "10-14-0001",
  concurrencyLimit: 3,        // 并发数量
  systemPrompt: "...",
  showProgress: true,
  enableFSM: true,            // 启用 FSM
  enableTests: false,         // 启用测试生成
};
```

**运行:**
```bash
node batch-add.mjs
```

## 测试文件

### `test-multi-agent.mjs`
测试 HTML + FSM 生成（两个 Agent）。

```bash
node test-multi-agent.mjs
```

### `test-three-agents.mjs`
测试完整流程（三个 Agent）。

```bash
node test-three-agents.mjs
```

**输出示例:**
```
========================================
测试三个 Agent 协同工作
========================================
任务: 生成计数器应用
- Agent 1: HTML 生成
- Agent 2: FSM 生成
- Agent 3: Playwright 测试生成
========================================

[THREE-AGENTS-TEST] ========== 阶段 1: HTML 生成 ==========
...
[THREE-AGENTS-TEST] ========== 阶段 2: FSM 生成 ==========
...
[THREE-AGENTS-TEST] ========== 阶段 3: Playwright 测试生成 ==========
...
[THREE-AGENTS-TEST] ========== 阶段 4: 保存结果 ==========

总耗时: 22.59s
结果ID: 1bdbde50-b3fc-11f0-b59e-bf05f67ef051

FSM 信息:
- 状态数: 3
- 事件数: 2
- 主题: Counter Application

测试文件信息:
- 文件路径: workspace/test-agents/tests/16cd9e30-...-counter-application.spec.js

所有三个 Agent 成功协同工作! ✓
```

## 输出文件结构

```
workspace/
  {workspace-name}/
    html/
      {uuid}.html              # 包含 FSM 的 HTML 文件
    tests/
      {uuid}-{topic}.spec.js   # Playwright 测试文件
    data/
      data.json                # 元数据和结果记录
```

### HTML 文件结构

```html
<!DOCTYPE html>
<html>
  <head>...</head>
  <body>
    <!-- 交互式内容 -->
    
    <script>
      // JavaScript 代码
    </script>
    
    <!-- FSM 定义 -->
    <script id="fsm" type="application/json">
    {
      "topic": "...",
      "states": [...],
      "events": [...]
    }
    </script>
  </body>
</html>
```

### 测试文件结构

```javascript
import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:5500/workspace/.../html/{uuid}.html';

test.describe('Application Tests', () => {
    test('Initial state is idle', async ({ page }) => {
        await page.goto(BASE_URL);
        // 测试逻辑
    });
    
    test('State transition: idle -> active', async ({ page }) => {
        // 测试状态转换
    });
    
    // 更多测试...
});
```

## 数据格式

### data.json 记录

```json
{
  "id": "uuid",
  "timestamp": "2024-10-28T12:00:00.000Z",
  "model": "gpt-4o-mini",
  "status": "success",
  "question": "创建计数器",
  "answer": { "role": "assistant", "content": "..." },
  "messages": [...],
  "evaluation": { "score": null, "notes": "" },
  "topic": "Counter Application",
  "hasFSM": true,
  "hasTest": true,
  "fsm": {
    "topic": "...",
    "states": [...],
    "events": [...]
  }
}
```

## 最佳实践

### 1. 选择正确的 Agent 组合

**只需要 HTML:**
```bash
node add.mjs ... --no-fsm
```

**需要文档化的交互逻辑:**
```bash
node add.mjs ... # FSM 默认启用
```

**需要自动化测试:**
```bash
node add.mjs ... --enable-tests
```

### 2. 并发控制

对于批量任务，根据 API 限制调整并发数：

```javascript
const CONFIG = {
  concurrencyLimit: 3,  // OpenAI API: 通常 3-5
};
```

### 3. 主题命名

提供清晰的主题名称以获得更好的 FSM 和测试：

```bash
--topic "冒泡排序可视化"     # ✓ 好
--topic "排序"               # ✗ 太模糊
```

### 4. 错误处理

每个 Agent 都有独立的错误处理：
- Agent 1 失败 → 保存错误信息并终止
- Agent 2 失败 → 继续保存 HTML（无 FSM）
- Agent 3 失败 → 继续保存 HTML 和 FSM（无测试）

## 性能指标

基于 `test-three-agents.mjs` 的实际运行：

| 阶段 | 平均耗时 | 说明 |
|------|---------|------|
| HTML 生成 | ~8-12s | 取决于复杂度 |
| FSM 生成 | ~4-6s | 分析 HTML 结构 |
| 测试生成 | ~6-10s | 基于 FSM 生成 |
| **总计** | **~20-25s** | 完整流程 |

## 故障排除

### 问题 1: "No such file or directory"
**原因:** 工作空间目录不存在  
**解决:** 系统会自动创建目录

### 问题 2: FSM 生成失败
**原因:** HTML 结构不清晰或无交互元素  
**解决:** 
- 检查 HTML 是否包含按钮、输入框等交互元素
- 使用更详细的问题描述

### 问题 3: 测试生成但无法运行
**原因:** BASE_URL 不正确或 HTML 未启动服务器  
**解决:**
- 确保 HTML 文件通过 Live Server 提供服务
- 检查 BASE_URL 是否匹配实际路径

### 问题 4: 并发写入冲突
**原因:** 已通过 ConcurrentFileWriter 解决  
**说明:** 系统会自动排队所有写入操作

## 高级用法

### 自定义 Agent 配置

在 `lib/add-core.mjs` 中修改：

```javascript
const result = await generateFSM(htmlContent, fsmTopic, {
  showProgress,
  taskId: taskId ? `${taskId}-FSM` : null,
  model: "gpt-4o",  // 使用不同模型
});
```

### 扩展 FSM 格式

在 `lib/fsm-agent.mjs` 的系统提示中添加新字段：

```javascript
const systemPrompt = `
...
- actions: Array of side effects
- guards: Array of conditions
...
`;
```

### 自定义测试模板

修改 `lib/playwright-agent.mjs` 中的系统提示：

```javascript
const systemPrompt = `
...
Additional requirements:
- Add accessibility tests
- Include performance checks
- Test error states
...
`;
```

## 未来改进

- [ ] 支持更多测试框架（Cypress, Jest）
- [ ] 添加测试覆盖率分析
- [ ] 自动运行生成的测试
- [ ] FSM 可视化工具
- [ ] 支持 TypeScript 测试
- [ ] 集成 CI/CD 流程

## 参考资料

- [OpenAI API 文档](https://platform.openai.com/docs/api-reference)
- [Playwright 文档](https://playwright.dev/)
- [有限状态机理论](https://en.wikipedia.org/wiki/Finite-state_machine)
- [并发控制模式](https://en.wikipedia.org/wiki/Concurrency_control)

## 许可证

MIT

---

**最后更新:** 2024-10-28  
**版本:** 3.0.0 (三个 Agent)
