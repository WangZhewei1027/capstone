# 多 Agent 系统 - HTML 生成与 FSM 提取

这个系统使用两个协同工作的 AI Agent 来生成交互式 HTML 页面并自动提取有限状态机（FSM）定义。

## 架构概览

```
用户请求 
   ↓
Agent 1: HTML 生成
   ↓
   生成完整的交互式 HTML
   ↓
Agent 2: FSM 分析
   ↓
   分析 HTML 提取状态机
   ↓
   整合 FSM 到 HTML
   ↓
最终输出（HTML + FSM）
```

## 两个 Agent 的职责

### Agent 1: HTML 生成 Agent
- **功能**: 根据用户需求生成完整的交互式 HTML 页面
- **输入**: 用户问题、系统提示
- **输出**: 包含 HTML/CSS/JavaScript 的完整页面
- **特点**: 支持流式输出，实时显示生成过程

### Agent 2: FSM 生成 Agent
- **功能**: 分析 HTML 代码，提取有限状态机定义
- **输入**: Agent 1 生成的 HTML 内容、主题/概念名称
- **输出**: JSON 格式的 FSM 定义
- **特点**: 
  - 识别所有交互状态
  - 提取状态转换事件
  - 识别状态的 onEnter/onExit 动作
  - 生成结构化的 FSM 描述

## 使用方法

### 1. 单任务模式 (add.mjs)

```bash
# 基本使用（启用 FSM）
node add.mjs -w "workspace-name" -m "gpt-4o-mini" -q "创建一个计数器" -t "计数器"

# 禁用 FSM 生成
node add.mjs -w "test" -m 1 -q "创建一个时钟" --no-fsm

# 交互式输入
node add.mjs
```

**参数说明:**
- `-w, --workspace`: 工作空间名称
- `-m, --model`: 模型名称或编号
- `-q, --question`: 问题内容
- `-s, --system`: 系统提示词
- `-t, --topic`: 主题/概念名称（用于 FSM 生成）
- `--no-fsm`: 禁用 FSM 生成
- `-h, --help`: 显示帮助信息

### 2. 批处理模式 (batch-add.mjs)

编辑 `batch-add.mjs` 配置:

```javascript
const CONFIG = {
  workspace: "10-14-0001",
  concurrencyLimit: 3,        // 并发数量
  systemPrompt: "...",
  showProgress: true,
  enableFSM: true,            // 启用/禁用 FSM
};

const tasks = [
  {
    workspace: CONFIG.workspace,
    model: "gpt-4o",
    question: "...",
    system: CONFIG.systemPrompt,
    topic: "主题名称",        // FSM 主题
  },
];
```

运行:
```bash
node batch-add.mjs
```

### 3. 测试多 Agent 系统

```bash
node test-multi-agent.mjs
```

## FSM 格式说明

生成的 FSM 会以 `<script id="fsm">` 标签形式插入到 HTML 文件中：

```html
<script id="fsm" type="application/json">
{
  "topic": "主题名称",
  "description": "FSM 描述",
  "states": [
    {
      "name": "idle",
      "onEnter": "actionName",
      "on": {
        "EVENT_NAME": "nextState"
      }
    }
  ],
  "events": ["EVENT1", "EVENT2"],
  "notes": "实现注意事项"
}
</script>
```

### FSM 结构

- **topic**: 应用主题/概念
- **description**: FSM 的简要描述
- **states**: 状态数组
  - `name`: 状态名称（如 idle, playing, paused）
  - `onEnter`: 进入状态时执行的动作（可选）
  - `onExit`: 离开状态时执行的动作（可选）
  - `on`: 事件到下一状态的映射
- **events**: 所有事件的列表
- **notes**: 实现相关的注释

## 输出文件

### 1. 数据文件
`./workspace/{workspace}/data/data.json`

包含完整的任务信息：
```json
{
  "id": "uuid",
  "timestamp": "ISO时间戳",
  "model": "使用的模型",
  "status": "success",
  "question": "用户问题",
  "answer": "生成的内容",
  "messages": [...],
  "topic": "主题",
  "hasFSM": true,
  "fsm": { ... }
}
```

### 2. HTML 文件
`./workspace/{workspace}/html/{uuid}.html`

完整的 HTML 文件，包含：
- 交互式页面内容
- FSM 定义（`<script id="fsm">`）

## 示例

### 示例 1: 计数器应用

```bash
node add.mjs -w "examples" -m "gpt-4o-mini" \
  -q "创建一个简单的计数器，包含加减和重置按钮" \
  -t "交互式计数器"
```

生成的 FSM:
```json
{
  "topic": "Interactive Counter",
  "states": [
    {"name": "idle", "on": {"INCREMENT": "incrementing", ...}},
    {"name": "incrementing", "onEnter": "updateDisplay", ...},
    {"name": "decrementing", "onEnter": "updateDisplay", ...},
    {"name": "resetting", "onEnter": "updateDisplay", ...}
  ],
  "events": ["INCREMENT", "DECREMENT", "RESET", "DONE"]
}
```

### 示例 2: 冒泡排序可视化

```bash
node add.mjs -w "examples" -m "gpt-4o" \
  -q "创建一个交互式冒泡排序演示，包含步进、播放、重置功能" \
  -t "冒泡排序"
```

生成的 FSM 会包含更复杂的状态：
- idle, ready, comparing, swapping, playing, paused, done

## 并发控制

批处理模式支持并发处理多个任务：

```javascript
const CONFIG = {
  concurrencyLimit: 3,  // 同时最多运行 3 个任务
};
```

好处：
- 提高处理速度
- 避免 API 限流
- 并发安全的文件写入

## 核心模块

### 1. `lib/add-core.mjs`
主要功能模块：
- `chatWithOpenAI()`: HTML 生成
- `processTask()`: 协调两个 Agent
- `saveResult()`: 保存结果和 HTML

### 2. `lib/fsm-agent.mjs`
FSM 处理模块：
- `generateFSM()`: 生成 FSM
- `insertFSMIntoHTML()`: 插入 FSM 到 HTML
- `fsmToScriptTag()`: 转换为 script 标签

### 3. `lib/concurrent-file-writer.mjs`
并发安全的文件写入器

### 4. `lib/concurrency-limiter.mjs`
并发控制器

## 技术特点

1. **流式输出**: 实时显示生成过程，避免超时
2. **并发安全**: 支持多任务并发执行，文件写入安全
3. **模块化设计**: Agent 职责清晰，易于扩展
4. **错误处理**: 完善的错误捕获和降级策略
5. **灵活配置**: 可选择启用/禁用 FSM 生成

## 故障处理

### FSM 生成失败
如果 FSM Agent 失败，系统会：
1. 记录错误信息
2. 继续保存原始 HTML
3. 在输出中标记 `hasFSM: false`

### 并发冲突
使用队列机制确保文件写入的顺序性和完整性。

## 性能考虑

- FSM 生成会增加约 30-50% 的总耗时
- 建议对复杂交互应用启用 FSM
- 简单静态页面可以使用 `--no-fsm` 跳过

## 下一步

可能的扩展方向：
1. **Agent 3**: 代码质量检查 Agent
2. **Agent 4**: 可访问性测试 Agent
3. **Agent 5**: 性能优化 Agent
4. 支持更多 FSM 格式（Mermaid、DOT 等）
5. FSM 可视化生成

## 故障排查

### 常见问题

**Q: FSM 生成失败怎么办？**
A: HTML 仍会正常生成，只是不包含 FSM。检查日志中的错误信息。

**Q: 如何禁用 FSM？**
A: 使用 `--no-fsm` 参数或在配置中设置 `enableFSM: false`。

**Q: FSM 不准确怎么办？**
A: 提供更清晰的 `topic` 参数，或使用更强大的模型（如 gpt-4o）。

**Q: 并发任务会不会冲突？**
A: 不会，系统使用队列机制确保文件写入安全。
