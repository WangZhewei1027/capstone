# Capstone - 交互式网页生成与测试系统

一个基于 AI 的多 Agent 系统，用于自动生成交互式教学 HTML 页面、提取有限状态机（FSM）并生成端到端测试，支持大规模并发生成和自动化测试评估。

运行指令：

```bash
# =================================== 生成 =========================================
# 批量生成所有 html-fsm-playwright (注：playwright test统一用5-mini)：
node batch-workflow.mjs -c 100 --html-model "gpt-4o-mini" --fsm-model "gpt-4o-mini" --playwright-model "gpt-5-mini"  -w "{workspace}" -q "./question-list.json"

node batch-workflow.mjs -c 100 --html-model "gpt-4o-mini" --fsm-model "gpt-4o-mini" --playwright-model "gpt-5-mini"  -w "batch-1207" -q "./question-list.json"

node batch-workflow.mjs -c 100 --html-model "gpt-5-mini" --fsm-model "gpt-4o-mini" --playwright-model "gpt-5-mini"  -w "batch-1207" -q "./question-list.json"

node batch-workflow.mjs -c 100 --html-model "gpt-3.5-turbo" --fsm-model "gpt-4o-mini" --playwright-model "gpt-5-mini"  -w "batch-1207" -q "./question-list.json"

node batch-workflow.mjs -c 100 --html-model "deepseek-chat" --fsm-model "gpt-4o-mini" --playwright-model "gpt-5-mini"  -w "batch-1207" -q "./question-list.json"

node batch-workflow.mjs -c 100 --html-model "Qwen1.5-0.5B-Chat" --fsm-model "gpt-4o-mini" --playwright-model "gpt-5-mini"  -w "batch-1207" -q "./question-list.json"

node batch-workflow.mjs -c 100 --html-model "meta-llama/Llama-3.2-1B-Instruct" --fsm-model "gpt-4o-mini" --playwright-model "gpt-5-mini"  -w "batch-1207" -q "./question-list.json"


# ----
node batch-workflow.mjs -c 100 --html-model "meta-llama/Llama-3.2-1B-Instruct" --fsm-model "gpt-4o-mini" --playwright-model "gpt-4o-mini"  -w "batch-1210-2" -q "./question-list-short.json"



# 补充生成 Ideal FSM
node batch-workflow.mjs -c 100 --ideal-fsm -w "batch-1207" -q "./question-list.json"

node batch-workflow.mjs -c 100 --ideal-fsm -w "batch-1210-subtest2" -q "./question-list.json"





# =================================== Baseline Evaluation =========================================
# 验证测试文件语法: (运行test前进行)
node validate-tests.mjs workspace/{workspace}

# 运行Playwright Test Baseline: (10+ min)
npx playwright test workspace/{workspace}/tests/ --workers=100

# 统计测试结果:
node analyze-pass-rate.mjs workspace/{workspace}


# =================================== FSM Evaluation ==========================================
# 运行相似度测试：
node batch-similarity-eval.mjs {workspace}
node batch-similarity-eval.mjs batch-1207
node batch-similarity-eval.mjs batch-1210-subtest2

# 统计FSM相似度:
node analyze-model-similarity.mjs {workspace}
node analyze-model-similarity.mjs batch-1207
node analyze-model-similarity.mjs batch-1210-subtest2

# 结果示例：
工作空间: batch-1207
数据路径: workspace\batch-1207\fsm-similarity-results.json

📊 总体统计: 219 个文件, 219 个成功匹配
✅ 成功分析的FSM数量: 219

📈 模型性能分析:
模型                   | 数量     | 平均相似度        | 结构       | 语义       | 同构       | 标准差
─────────────────────────────────────────────────────────────────────────────────────
gpt-5-mini           | 46     | 32.1        % | 67.5    % | 12.7    % | 0.0     % | 0.124
deepseek-chat        | 47     | 30.4        % | 62.1    % | 13.9    % | 0.0     % | 0.084
gpt-4o-mini          | 47     | 27.5        % | 52.1    % | 16.7    % | 0.0     % | 0.057
gpt-3.5-turbo        | 46     | 26.3        % | 48.1    % | 17.7    % | 0.0     % | 0.188
Qwen1.5-0.5B-Chat    | 33     | 23.6        % | 44.0    % | 14.9    % | 0.0     % | 0.051

📊 可视化报告已生成: workspace\batch-1207\model-similarity-analysis.html
🌐 在浏览器中打开查看详细图表和分析

🎉 AI模型FSM相似度分析完成！
🏆 模型排名（按平均相似度）:
1. gpt-5-mini: 32.1% (46 个样本)
2. deepseek-chat: 30.4% (47 个样本)
3. gpt-4o-mini: 27.5% (47 个样本)
4. gpt-3.5-turbo: 26.3% (46 个样本)
5. Qwen1.5-0.5B-Chat: 23.6% (33 个样本)


# # =================================== FSM 提取与分析 ==========================================
node analyze-fsm-differentiation.mjs {workspace}
node analyze-correlation.mjs {workspace}
node analyze-fsm-dimensions.mjs {workspace}

node analyze-fsm-differentiation.mjs workspace\batch-1207
node analyze-correlation.mjs workspace\batch-1207
node analyze-fsm-dimensions.mjs workspace\batch-1207




```

## 📋 系统架构

```
用户提示 → Agent 1 (HTML) → Agent 2 (FSM) → Agent 3 (Tests) → Playwright 测试执行
                ↓                ↓                ↓                    ↓
           HTML文件         FSM JSON        测试文件              测试结果分析
                                                                       ↓
                                                              得分统计 & 可视化
```

### 核心功能流程

1. **HTML 生成** - 根据教学主题生成交互式网页
2. **FSM 提取** - 自动提取页面交互状态机
3. **测试生成** - 基于 FSM 生成 Playwright 端到端测试
4. **批量执行** - 支持大规模并发生成（100+ 任务）
5. **自动测试** - 自动运行测试并收集结果
6. **结果分析** - 测试得分统计和正态分布分析
7. **可视化展示** - React 可视化面板查看所有结果

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

### 核心工作流程

#### 1. 生成阶段 - 并发批量生成内容

使用 `concurrent.mjs` 进行大规模并发生成（推荐）：

```bash
node concurrent.mjs
```

**配置说明** (在 `concurrent.mjs` 中):

```javascript
const TEST_CONFIG = {
  workspace: "11-08-0003", // 工作空间名称
  concurrencyLimit: 15, // 并发任务数（建议 10-20）
  defaultTopic: "bubble sort", // 默认主题
  enableFSM: true, // 启用 FSM 生成
  enableTests: true, // 启用测试生成
  showProgress: false, // 是否显示详细进度
  generationsPerQuestion: 1, // 每个问题生成次数

  // 每个 Agent 使用的模型配置
  models: {
    htmlAgent: "gpt-4o-mini", // Agent 1: HTML 生成
    fsmAgent: "gpt-4o-mini", // Agent 2: FSM 生成
    testAgent: "gpt-4o-mini", // Agent 3: 测试生成
  },
};
```

**问题列表配置** (`question-list.json`):

```json
[
  "Create an interactive bubble sort visualization",
  {
    "question": "Create a binary search tree visualization",
    "generations": 3
  }
]
```

支持两种格式：

- **字符串格式** - 使用默认生成次数
- **对象格式** - 可单独指定该问题的生成次数

**输出示例**:

```
开始并发测试...
问题数量: 20, 总任务数: 60, 并发限制: 15
每个问题生成次数: 3

[Q1-G1] 开始执行...
[Q1-G2] 开始执行...
[Q1-G1] 完成 - 耗时: 45.32s
[Q1-G1] ✓ FSM (7 个状态)
[Q1-G1] ✓ 测试 (test-file.spec.js)
```

#### 2. 测试阶段 - 验证和运行测试

**步骤 1: 验证测试文件语法**

```bash
node validate-tests.mjs workspace/11-08-0003
```

此脚本会：

- ✅ 检测重复声明的变量
- ✅ 检测括号不匹配
- ✅ 自动修复语法错误
- ✅ 重命名无法修复的文件为 `.invalid`

**步骤 2: 运行 Playwright 测试**

```bash
# 基本运行（15 个并发 worker）
npx playwright test workspace/11-08-0003/tests/ --workers=15

# 高并发运行
npx playwright test workspace/11-08-0003/tests/ --workers=100

# 查看测试报告
npx playwright show-report workspace/11-08-0003/test-results/html-report
```

**步骤 3: 提取测试统计**

```bash
node extract-test-stats.mjs workspace/11-08-0003
```

此脚本会：

- 📊 提取每个 UUID 的测试结果
- ✅ 计算测试得分 (成功/总数)
- 📝 更新到 `data.json`

输出示例：

```
📊 全局测试统计:
   总计: 1010
   ✅ 成功: 450
   ❌ 失败: 520
   ⏭️  跳过: 40
   📊 得分: 44.55% (450/1010)

📊 各 UUID 测试统计:
   UUID: abc-123-def
   总计: 7 | ✅ 5 | ❌ 2 | ⏭️ 0 | 📊 71.43% (5/7)
```

#### 3. 分析阶段 - 统计和可视化

**分析测试得分分布**

```bash
node analyze-scores.mjs workspace/11-08-0003
```

此脚本会：

- 📊 统计得分分布
- 📈 检验正态性（偏度、峰度、卡方检验）
- 📉 生成百分位数统计
- 🎨 生成交互式 HTML 报告

输出包括：

```
📈 基本统计:
   总数: 141
   平均分: 17.91%
   标准差: 11.51%

📊 分布特征:
   偏度: 1.103
   峰度: 2.683
   正态性评分: 18.5%

🎯 正态性结论:
   ❌ 得分分布偏离正态分布较大
```

**可视化查看面板**

```bash
# 终端 1: 启动 API 服务器
node api.mjs

# 终端 2: 打开可视化面板
open viewer-react.html
```

面板功能：

- 🖼️ 预览所有生成的 HTML 页面
- 🔍 筛选器（模型、标签、日期）
- 📊 查看 FSM 状态机图
- 🧪 查看测试结果和得分
- ⭐ 视觉评估报告

### 单任务生成（快速测试）

```bash
node add.mjs
```

交互式输入或使用参数：

```bash
node add.mjs \
  --workspace "demo" \
  --model "gpt-4o-mini" \
  --question "创建一个冒泡排序可视化" \
  --topic "冒泡排序" \
  --enable-tests
```

## 📁 输出文件结构

```
workspace/
  {workspace-name}/              # 例如: 11-08-0003
    html/
      {uuid}.html                # 生成的交互式 HTML 页面
    fsm/
      {uuid}.json                # 独立的 FSM JSON 文件
    tests/
      {uuid}-interactive-application.spec.js  # Playwright 测试
    test-results/
      results.json               # 测试执行结果
      html-report/               # HTML 测试报告
      test-artifacts/            # 截图和视频
    data/
      data.json                  # 包含所有元数据和测试统计
    score-analysis-report.html   # 得分分布分析报告（生成后）
    visuals/                     # 视觉评估截图（可选）
      {uuid}/
        *.png
```

### data.json 结构

```json
{
  "0": {
    "id": "abc-123-def-456",
    "model": "gpt-4o-mini",
    "question": "Create bubble sort visualization",
    "timestamp": "2025-11-08T...",
    "messages": [...],
    "testStats": {
      "total": 7,
      "passed": 5,
      "failed": 2,
      "skipped": 0,
      "score": 0.7143,           // 新增：测试得分
      "timestamp": "2025-11-08T..."
    }
  },
  "globalTestStats": {            // 新增：全局统计
    "total": 1010,
    "passed": 450,
    "failed": 520,
    "skipped": 40,
    "score": 0.4455
  }
}
```

## 🎭 完整测试工作流

### 推荐的完整流程

```bash
# 1. 生成内容（并发）
node concurrent.mjs

# 2. 验证测试文件
node validate-tests.mjs workspace/11-08-0003

# 3. 运行测试
npx playwright test workspace/11-08-0003/tests/ --workers=15

# 4. 提取测试统计
node extract-test-stats.mjs workspace/11-08-0003

# 5. 分析得分分布
node analyze-scores.mjs workspace/11-08-0003

# 6. 查看可视化报告
node api.mjs  # 启动 API
open viewer-react.html  # 打开面板
```

### Playwright 测试选项

```bash
# 基本运行
npx playwright test workspace/11-08-0003/tests/

# 高并发运行（推荐）
npx playwright test workspace/11-08-0003/tests/ --workers=15

# UI 模式（交互式调试）
npx playwright test workspace/11-08-0003/tests/ --ui

# 显示浏览器窗口
npx playwright test workspace/11-08-0003/tests/ --headed

# 调试模式（逐步执行）
npx playwright test workspace/11-08-0003/tests/ --debug

# 查看 HTML 报告
npx playwright show-report workspace/11-08-0003/test-results/html-report

# 运行特定测试文件
npx playwright test workspace/11-08-0003/tests/abc-123.spec.js
```

### 测试验证脚本说明

`validate-tests.mjs` 自动修复常见语法错误：

1. **重复声明变量**

   ```javascript
   // 错误
   const button = ...;
   const button = ...;  // ❌ 重复

   // 自动修复为
   const button = ...;
   const button1 = ...;  // ✅ 重命名
   ```

2. **括号不匹配**

   ```javascript
   // 错误
   expect(...).toBe('value';  // ❌ 缺少 )

   // 自动修复为
   expect(...).toBe('value');  // ✅ 添加 )
   ```

3. **无法修复的文件**
   - 自动重命名为 `.invalid` 后缀
   - 避免阻塞其他测试运行

## 🖥️ 可视化查看面板

React 界面，提供完整的结果查看和管理功能。

### 启动步骤

```bash
# 1. 启动 API 服务器
node api.mjs

# 2. 在浏览器中打开
open viewer-react.html
# 或访问: file:///path/to/capstone/viewer-react.html
```

### 面板功能特性

#### 📊 卡片视图

- **预览** - 每个 HTML 页面的实时预览
- **元数据** - 模型、时间戳、问题描述
- **测试统计** - 显示测试得分和通过率
  - 总计、通过、失败、跳过数量
  - **得分百分比** - 颜色编码（绿色 ≥80%、橙色 60-80%、红色<60%）

#### 🔍 筛选器

- 按模型筛选
- 按标签筛选
- 按日期范围筛选
- 按问题关键词搜索

#### � FSM 可视化

- 点击 "FSM 可视化" 按钮
- D3.js 交互式状态机图
- 状态按功能分组（输入、执行、显示等）
- 点击状态节点查看对应截图
- 显示状态转换和事件

#### 🎨 视觉评估（可选）

- 点击 "视觉评估" 按钮
- 查看 AI 评估报告
  - 总体评分、布局质量、内容丰富度、交互逻辑
  - 优点、缺点、改进建议
- 查看评估截图（初始、交互、完成状态）

### API 端点

API 服务器 (`api.mjs`) 提供以下端点：

- `GET /api/workspaces` - 获取所有工作空间列表
- `GET /api/workspaces/:workspace/data` - 获取工作空间数据
- `GET /api/workspaces/:workspace/stats` - 获取统计信息
- `GET /api/fsm/:workspace/:uuid` - 获取 FSM 数据
- `GET /api/screenshots/:workspace/:uuid` - 获取截图列表
- `GET /api/evaluation/:workspace/:filename` - 获取评估报告
- `POST /api/evaluation/:workspace/:filename` - 执行新评估

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
├── lib/                              # 核心库
│   ├── add-core.mjs                 # 主流程编排（三个 Agent）
│   ├── fsm-agent.mjs                # Agent 2: FSM 生成
│   ├── playwright-agent.mjs         # Agent 3: 测试生成
│   ├── concurrent-file-writer.mjs   # 并发安全文件写入
│   └── concurrency-limiter.mjs      # 并发控制器
│
├── workspace/                        # 生成的所有内容
│   ├── 11-08-0001/                  # 工作空间示例
│   ├── 11-08-0002/
│   └── 11-08-0003/
│       ├── html/                    # HTML 文件
│       ├── fsm/                     # FSM JSON 文件
│       ├── tests/                   # Playwright 测试
│       ├── test-results/            # 测试结果
│       ├── data/                    # 元数据
│       └── score-analysis-report.html
│
├── add.mjs                          # 单任务生成工具
├── concurrent.mjs                   # 高级并发批量处理（推荐）
├── validate-tests.mjs               # 测试文件语法验证和修复
├── extract-test-stats.mjs           # 提取测试统计到 data.json
├── analyze-scores.mjs               # 得分分布分析和可视化
│
├── api.mjs                          # REST API 服务器
├── viewer-react.html                # React 可视化面板
├── fsm-visualizer.html              # FSM 可视化工具（独立）
│
├── question-list.json               # 批量任务问题列表
├── model-list.json                  # 可用模型列表
├── playwright.config.js             # Playwright 配置
├── package.json                     # 依赖配置
│
└── README.md                        # 本文件
```

### 核心脚本说明

| 脚本                     | 功能           | 使用场景                    |
| ------------------------ | -------------- | --------------------------- |
| `concurrent.mjs`         | 大规模并发生成 | 生成 100+ HTML + FSM + 测试 |
| `validate-tests.mjs`     | 测试文件验证   | 运行测试前修复语法错误      |
| `extract-test-stats.mjs` | 提取测试结果   | 测试运行后提取统计          |
| `analyze-scores.mjs`     | 得分分布分析   | 分析测试质量和正态性        |
| `add.mjs`                | 单任务生成     | 快速测试单个问题            |
| `api.mjs`                | API 服务器     | 为可视化面板提供数据        |

## ⚠️ 注意事项

### 重要提示

1. **并发控制**

   - 建议并发数：10-20（取决于 API 速率限制）
   - OpenAI API 通常限制：3-5 RPM（免费层）
   - 使用 `concurrencyLimit` 控制并发数

2. **测试验证**

   - ⚠️ **必须先运行** `validate-tests.mjs` 再运行测试
   - 自动生成的测试可能有语法错误
   - 验证脚本会自动修复大部分错误

3. **Playwright 配置**

   - `maxFailures: undefined` - 不限制失败数量
   - `fullyParallel: true` - 完全并行运行
   - 即使部分测试失败，也会继续运行其他测试

4. **文件处理**

   - ⚠️ **不要在 VS Code 中直接打开或保存生成的 HTML 文件**
   - VS Code 的自动格式化可能破坏 HTML 结构
   - 建议使用浏览器查看，或使用可视化面板

5. **成本优化**

   ```javascript
   // 推荐配置：平衡质量和成本
   models: {
     htmlAgent: "gpt-4o",         // 最重要，用强模型
     fsmAgent: "gpt-4o-mini",     // 相对简单，用轻量模型
     testAgent: "gpt-4o-mini",    // 可以用轻量模型
   }
   ```

6. **数据持久化**
   - 所有生成结果自动保存到 `data.json`
   - 测试统计通过 `extract-test-stats.mjs` 更新
   - 支持增量更新，不会覆盖现有数据

### 性能建议

- **生成阶段**：`concurrencyLimit: 15`（建议）
- **测试阶段**：`--workers=15`（根据 CPU 核心数调整）
- **大规模测试**：先验证少量样本，再批量运行

## 🔧 故障排除

### 问题 1: 测试语法错误导致全部停止

**症状**:

```
SyntaxError: Unexpected token, expected ","
```

**解决**:

```bash
# 运行验证脚本自动修复
node validate-tests.mjs workspace/11-08-0003

# 然后重新运行测试
npx playwright test workspace/11-08-0003/tests/ --workers=15
```

### 问题 2: 并发生成失败

**症状**: API 请求失败或超时

**解决**:

- 降低 `concurrencyLimit`（建议 3-5）
- 检查 API 密钥和配额
- 查看错误日志

### 问题 3: data.json 格式错误

**症状**: 无法读取或解析 data.json

**解决**:

```bash
# 检查 JSON 格式
cat workspace/11-08-0003/data/data.json | jq .

# 如果损坏，从备份恢复或重新生成
```

### 问题 4: 测试找不到元素

**症状**: `Error: Locator.click: Target closed`

**可能原因**:

- 页面加载不完整
- 选择器不正确
- 交互元素未渲染

**解决**:

```bash
# 使用调试模式检查
npx playwright test workspace/11-08-0003/tests/xxx.spec.js --debug

# 使用 headed 模式查看浏览器
npx playwright test workspace/11-08-0003/tests/xxx.spec.js --headed
```

### 问题 5: 得分分布异常

**症状**: 正态性评分很低（<20%）

**分析**:

```bash
node analyze-scores.mjs workspace/11-08-0003
```

**可能原因**:

- 测试质量参差不齐
- HTML 实现质量问题
- 测试用例设计不合理

**改进建议**:

- 使用更强的模型（gpt-4o）
- 优化 system prompt
- 增加生成样本数量

### 问题 6: API 服务器无法启动

**症状**: `Error: listen EADDRINUSE`

**解决**:

```bash
# 查找占用端口的进程
lsof -i :3000

# 杀死进程或更换端口
# 在 api.mjs 中修改端口号
```

### 问题 7: Playwright 测试卡住

**症状**: 测试长时间无响应

**解决**:

```bash
# 设置超时时间（在 playwright.config.js）
timeout: 10000  // 10秒

# 或使用 Ctrl+C 强制停止
```

## 📚 相关文档

- [THREE-AGENTS-README.md](THREE-AGENTS-README.md) - 三个 Agent 系统详细文档
- [MULTI-AGENT-README.md](MULTI-AGENT-README.md) - 多 Agent 架构说明
- [Playwright 文档](https://playwright.dev/)
- [OpenAI API 文档](https://platform.openai.com/docs/)


node compare-models.mjs \
  workspace/baseline-html2test-gpt-3.5-turbo \
  workspace/baseline-html2test-gpt-4o \
  workspace/baseline-html2test-gpt-4o-mini \
  workspace/baseline-html2test-gpt-5-mini \
  workspace/baseline-html2test-deepseek-chat \
  workspace/baseline-html2test-qwen1-5 \
  workspace/baseline-html2test-llama