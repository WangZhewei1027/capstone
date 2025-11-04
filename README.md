# Capstone - 交互式网页生成与测试系统

一个基于 AI 的多 Agent 系统，用于自动生成交互式 HTML 页面、提取有限状态机（FSM）并生成端到端测试。

## 🌟 功能特性

- **Agent 1 - HTML 生成器**: 根据提示生成完整的交互式 HTML 页面
- **Agent 2 - FSM 提取器**: 自动分析 HTML 并生成有限状态机定义
- **Agent 3 - 测试生成器**: 基于 FSM 自动生成 Playwright 端到端测试
- **并发处理**: 支持批量任务的并发执行
- **可视化面板**: React 界面查看和管理生成的内容
- **灵活配置**: 每个 Agent 可使用不同的 AI 模型

## 📋 系统架构

```
用户提示 → Agent 1 (HTML) → Agent 2 (FSM) → Agent 3 (Tests)
                ↓                ↓                ↓
           HTML文件         FSM JSON        Playwright测试
```

## 🚀 快速开始

### 环境要求

- Node.js v20+
- npm

### 安装

```bash
# 安装所有依赖
npm install

# 安装 Playwright 浏览器（首次运行）
npx playwright install
```

### 环境配置

创建 `.env` 文件：

```bash
OPENAI_API_KEY=your_api_key_here
OPENAI_BASE_URL=https://api.openai.com/v1  # 可选
```

## 📖 使用方法

### 1. 单任务生成 (add.mjs)

#### 方式 A: 交互式输入

```bash
node add.mjs
```

按提示输入：
- 工作空间名称
- 选择模型
- 输入问题描述
- 指定主题（可选）

#### 方式 B: 命令行参数

```bash
# 查看帮助
node add.mjs -h

# 完整示例（三个 Agent）
node add.mjs \
  --workspace "demo" \
  --model "gpt-4o-mini" \
  --question "创建一个冒泡排序可视化" \
  --topic "冒泡排序" \
  --enable-tests

# 只生成 HTML + FSM（两个 Agent）
node add.mjs -w "demo" -m "gpt-4o" -q "创建计算器" -t "计算器"

# 只生成 HTML（一个 Agent）
node add.mjs -w "demo" -m "gpt-4o-mini" -q "创建时钟" --no-fsm
```

**命令行选项：**
- `-w, --workspace <name>` - 工作空间名称
- `-m, --model <model>` - 模型名称或编号
- `-q, --question <text>` - 问题描述
- `-s, --system <text>` - 系统提示词
- `-t, --topic <text>` - 主题名称（用于 FSM 和测试）
- `--no-fsm` - 禁用 FSM 生成
- `--enable-tests` - 启用测试生成
- `-h, --help` - 显示帮助

### 2. 批量生成 (batch-add.mjs)

批量处理多个任务，支持并发执行。

```bash
node batch-add.mjs
```

**配置文件编辑** (`batch-add.mjs`):

```javascript
const CONFIG = {
  workspace: "10-28-0001",
  concurrencyLimit: 3,        // 并发数量
  systemPrompt: "...",         // 系统提示
  enableFSM: true,             // 启用 FSM
  enableTests: false,          // 启用测试生成
};
```

### 3. 高级批量处理 (concurrent.mjs)

支持每个 Agent 使用不同模型的高级批量处理。

```bash
node concurrent.mjs
```

**配置示例：**

```javascript
const TEST_CONFIG = {
  workspace: "10-28-0007",
  concurrencyLimit: 5,
  defaultTopic: "bubble sort",
  enableFSM: true,
  enableTests: true,
  showProgress: false,
  
  // 每个 Agent 使用不同模型
  models: {
    htmlAgent: "gpt-4o",        // HTML 生成
    fsmAgent: "gpt-4o-mini",    // FSM 提取
    testAgent: "gpt-4o-mini",   // 测试生成
  },
};
```

**问题列表格式** (`question-list.json`):

```json
[
  {
    "question": "创建冒泡排序可视化",
    "topic": "bubble sort"
  },
  {
    "question": "设计交互式计算器",
    "topic": "calculator"
  }
]
```

或简单字符串数组（使用默认 topic）：

```json
[
  "创建冒泡排序可视化",
  "设计交互式计算器"
]
```

## 📁 输出文件结构

```
workspace/
  {workspace-name}/
    html/
      {uuid}.html              # 包含 FSM 的 HTML 文件
    tests/
      {uuid}.spec.js           # Playwright 测试文件
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

## 🎭 运行 Playwright 测试

### 前置准备

启动 HTTP 服务器（在新终端窗口）：

```bash
# 方式 1: Python
cd workspace
python3 -m http.server 5500

# 方式 2: Node.js
cd workspace
npx http-server -p 5500
```

### 运行测试

```bash
# 基本运行
npx playwright test workspace/10-28-0007/tests/

# 显示浏览器（推荐用于调试）
npx playwright test workspace/10-28-0007/tests/ --headed

# UI 模式（推荐）
npx playwright test workspace/10-28-0007/tests/ --ui

# 调试模式
npx playwright test workspace/10-28-0007/tests/ --debug

# 指定浏览器
npx playwright test workspace/10-28-0007/tests/ --project=chromium

# 并行运行
npx playwright test workspace/10-28-0007/tests/ --workers=5

# 生成 HTML 报告
npx playwright test workspace/10-28-0007/tests/ --reporter=html
npx playwright show-report

# 运行所有工作空间的测试
npx playwright test workspace/*/tests/

# 使用通配符
npx playwright test workspace/10-28-0007/tests/*.spec.js
```

## 🖥️ 可视化查看面板

使用 React 界面查看和管理生成的内容。

### 启动步骤

```bash
# 1. 启动 API 服务器（终端 1）
npm run api

# 2. 启动 Live Server（终端 2）
# 使用 VS Code 的 Live Server 扩展
# 或使用命令：
npx http-server -p 5500

# 3. 访问面板
# 打开浏览器访问：
http://localhost:5500/viewer-react.html
```

### 面板功能

- 📊 查看所有生成的 HTML 页面
- 🔍 筛选和搜索结果
- 📈 查看 FSM 状态机
- ✅ 查看测试结果
- 📝 评分和备注

## 🛠️ 可用模型

在命令行中使用模型编号或名称：

1. gpt-4o
2. gpt-4o-mini
3. gpt-4-turbo
4. gpt-3.5-turbo
5. o1-preview
6. o1-mini

## 📊 项目结构

```
capstone/
├── lib/                          # 核心库
│   ├── add-core.mjs             # 主流程编排
│   ├── fsm-agent.mjs            # FSM 生成 Agent
│   ├── playwright-agent.mjs     # 测试生成 Agent
│   ├── concurrent-file-writer.mjs  # 并发安全文件写入
│   └── concurrency-limiter.mjs  # 并发控制器
├── workspace/                    # 生成的内容
│   └── {name}/
│       ├── html/                # HTML 文件
│       ├── tests/               # 测试文件
│       └── data/                # 元数据
├── add.mjs                      # 单任务工具å
├── concurrent.mjs               # 高级批量处理
├── api.mjs                      # API 服务器
├── viewer-react.html            # React 可视化面板
├── question-list.json           # 问题列表
├── model-list.json              # 模型列表
└── README.md                    # 本文件
```

## ⚠️ 注意事项

### 重要提示

- ⚠️ **不要在 VS Code 中直接打开或保存生成的 HTML 文件**
  - VS Code 的自动格式化可能会破坏 HTML 结构
  - 建议使用浏览器查看，或使用可视化面板

### 并发限制

- 根据 API 速率限制调整并发数
- OpenAI API 通常建议 3-5 个并发请求

### 成本优化

```javascript
// 示例：平衡质量和成本
models: {
  htmlAgent: "gpt-4o",         // 最重要，用强模型
  fsmAgent: "gpt-4o-mini",     // 相对简单，用轻量模型
  testAgent: "gpt-4o-mini",    // 可以用轻量模型
}
```

## 🔧 故障排除

### 问题 1: "Error: connect ECONNREFUSED"

**原因**: HTTP 服务器未启动  
**解决**: 确保在 `workspace` 目录运行 `python3 -m http.server 5500`

### 问题 2: 测试找不到元素

**原因**: 选择器不正确或页面未加载完成  
**解决**: 
- 使用 `--debug` 模式检查
- 添加显式等待 `page.waitForSelector()`

### 问题 3: 并发写入冲突

**原因**: 已通过 ConcurrentFileWriter 解决  
**说明**: 系统自动处理并发写入

### 问题 4: FSM 生成失败

**原因**: HTML 结构不清晰或无交互元素  
**解决**: 
- 使用更详细的问题描述
- 指定具体的交互需求

## 📚 相关文档

- [THREE-AGENTS-README.md](THREE-AGENTS-README.md) - 三个 Agent 系统详细文档
- [MULTI-AGENT-README.md](MULTI-AGENT-README.md) - 多 Agent 架构说明
- [Playwright 文档](https://playwright.dev/)
- [OpenAI API 文档](https://platform.openai.com/docs/)

## 🎯 使用场景

### 教育场景

生成交互式教学页面：
```bash
node add.mjs -w "education" -m "gpt-4o" \
  -q "创建冒泡排序的交互式教学页面" \
  -t "冒泡排序" --enable-tests
```

### 原型设计

快速生成原型并测试：
```bash
node batch-add.mjs  # 批量生成多个原型
```

### 自动化测试

为现有 HTML 生成测试：
```bash
node add.mjs -w "test" -m "gpt-4o-mini" \
  -q "为已有的计算器页面生成测试" \
  --enable-tests
```

## 📈 性能指标

基于实际运行（gpt-4o-mini）：

| 阶段 | 平均耗时 | 说明 |
|------|---------|------|
| HTML 生成 | 8-12s | 取决于复杂度 |
| FSM 生成 | 4-6s | 分析 HTML 结构 |
| 测试生成 | 6-10s | 基于 FSM 生成 |
| **总计** | **20-25s** | 完整的三 Agent 流程 |

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT

---

**最后更新**: 2025-10-30  
**版本**: 3.0.0 (三 Agent 系统)

