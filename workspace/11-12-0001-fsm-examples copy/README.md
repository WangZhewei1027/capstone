# 智能 FSM 提取与可视化工具

## 📋 项目概述

这是一个智能的有限状态机（FSM）自动提取和可视化分析工具，能够从 HTML 页面自动检测交互组件、探测用户行为并构建实际的 FSM 模型。

## 🛠️ 工具特性

- **智能组件检测**：自动识别 HTML 页面中的按钮、输入框、可视化容器等交互元素
- **行为探测**：模拟用户操作，自动测试各种交互行为并捕获页面状态变化
- **实际 FSM 重建**：基于探测结果智能构建状态机模型
- **可视化比较**：将提取的 FSM 与理想 FSM 进行对比分析
- **批量处理**：支持批量处理多个 HTML 文件
- **详细报告**：生成完整的分析报告和覆盖率统计

## 📁 项目结构

```
.
├── fsm-interactive-capture.spec.js    # 主要的FSM提取测试脚本
├── fsm-comparison-dashboard.html      # FSM可视化对比仪表板
├── html/                              # 待分析的HTML文件目录
├── fsm/                              # FSM提取结果输出目录
├── visuals/                          # 截图和可视化输出目录
└── README.md                         # 本文档
```

## 🚀 快速开始

### 1. 环境准备

#### 安装依赖

```bash
npm install @playwright/test
```

#### 安装 Playwright 浏览器

```bash
npx playwright install
```

### 2. 准备 HTML 文件

将需要分析的 HTML 文件放入 `html/` 目录中：

```bash
mkdir html
# 将你的HTML文件复制到html目录下
cp your-interactive-page.html html/
```

### 3. 运行 FSM 提取

#### ！！！！！！！！！

```bash
# 提取特定HTML文件的FSM
npx playwright test fsm-interactive-capture.spec.js
# 运行fsm visualization dashboard
cd workspace
python -m http.server 8080
```

#### 方式二：批量提取

```bash
# 批量处理html目录下的所有HTML文件
BATCH_MODE=true npx playwright test fsm-interactive-capture.spec.js
```

### 4. 查看结果

提取完成后，结果将保存在以下目录：

- `fsm/{文件名}/` - 每个 HTML 文件的 FSM 分析结果
- `visuals/{文件名}/` - 页面交互截图
- `fsm/overall_analysis_report.json` - 整体分析报告

## 📊 输出文件说明

### FSM 分析结果 (`fsm/{文件名}/`)

每个分析的 HTML 文件会生成以下文件：

| 文件名                     | 描述                             |
| -------------------------- | -------------------------------- |
| `extracted_fsm.json`       | 🤖 自动提取的 FSM 模型           |
| `ideal_fsm.json`           | 📋 理想 FSM 模型（如果页面包含） |
| `detected_components.json` | 🔍 检测到的页面组件列表          |
| `probe_results.json`       | 🧪 行为探测详细结果              |
| `fsm_comparison.json`      | 📈 FSM 对比分析报告              |
| `analysis_report.json`     | 📊 综合分析报告                  |

### 可视化截图 (`visuals/{文件名}/`)

- 初始页面状态截图
- 每次交互前后的页面状态对比截图
- 组件操作过程的可视化记录

### 整体报告 (`fsm/`)

- `overall_analysis_report.json` - 所有文件的汇总分析
- `batch_analysis_report.json` - 批量处理报告（批量模式下生成）

## 📖 使用示例

### 示例 1：分析单个页面

```bash
# 假设你有一个二叉搜索树可视化页面
cp bst-visualization.html html/

# 运行单文件分析
TARGET_HTML_FILE=bst-visualization.html npx playwright test fsm-interactive-capture.spec.js

# 查看结果
cat fsm/bst-visualization/analysis_report.json
```

### 示例 2：批量分析多个页面

```bash
# 准备多个HTML文件
cp *.html html/

# 运行批量分析
BATCH_MODE=true npx playwright test fsm-interactive-capture.spec.js

# 查看整体报告
cat fsm/overall_analysis_report.json
```

## 🎯 工具工作原理

### 1. 智能组件检测

- 自动扫描页面中的输入框、按钮、可视化容器
- 识别组件类型、位置和属性
- 生成组件交互策略

### 2. 行为探测

- 模拟用户点击、输入等操作
- 捕获操作前后的页面状态
- 检测 DOM 结构、可视元素、表单状态的变化

### 3. FSM 重建

- 基于状态变化推断状态转换
- 根据组件语义自动命名状态
- 构建完整的状态机模型

### 4. 覆盖率分析

- 与理想 FSM 进行对比（如果存在）
- 计算状态覆盖率和转换覆盖率
- 生成改进建议

## 📈 可视化仪表板

启动 HTTP 服务器查看 FSM 可视化对比：

```bash
# 启动本地服务器
python -m http.server 8080

# 在浏览器中访问
http://localhost:8080/fsm-comparison-dashboard.html
```

仪表板功能：

- 📊 多 FSM 并排对比
- 🔄 交互式状态图可视化
- 📈 覆盖率统计分析
- 💾 SVG 图形导出

## ⚙️ 配置选项

### 环境变量配置

| 变量名             | 描述                 | 默认值                                      | 示例           |
| ------------------ | -------------------- | ------------------------------------------- | -------------- |
| `BATCH_MODE`       | 是否启用批量处理模式 | `false`                                     | `true`         |
| `TARGET_HTML_FILE` | 单文件模式的目标文件 | `65f37f00-b408-11f0-ab52-fbe7249bf639.html` | `my-page.html` |

### 测试配置

可以在脚本中自定义以下参数：

- 页面稳定等待时间
- 组件探测超时设置
- 输入测试值列表
- 截图保存选项

## 🔧 故障排除

### 常见问题

1. **找不到 HTML 文件**

   ```bash
   # 确保html目录存在且包含HTML文件
   ls -la html/
   ```

2. **Playwright 浏览器未安装**

   ```bash
   npx playwright install chromium
   ```

3. **权限错误**
   ```bash
   # 确保有写入权限
   chmod -R 755 fsm/ visuals/
   ```

### 调试模式

启用详细日志输出：

```bash
DEBUG=pw:* npx playwright test fsm-interactive-capture.spec.js
```

## 📊 示例输出

### 提取的 FSM 结构示例

```json
{
  "meta": {
    "concept": "ExtractedFromActualPage",
    "extraction_method": "automated_probing",
    "timestamp": "2024-11-19T10:30:00.000Z"
  },
  "states": [
    {
      "id": "S0_Idle",
      "label": "Idle",
      "type": "idle",
      "entry_actions": ["renderPage()", "enableControls()"]
    },
    {
      "id": "S1_InsertStart",
      "label": "InsertStart",
      "type": "atomic",
      "entry_actions": ["readInputValue()", "highlightInput()"]
    }
  ],
  "events": [
    {
      "id": "UserClickinsertButton",
      "event_type": "user_action",
      "description": "User clicks button insertButton"
    }
  ],
  "transitions": [
    {
      "from": "S0_Idle",
      "to": "S1_InsertStart",
      "event": "UserClickinsertButton",
      "guard": "buttonEnabled",
      "actions": ["captureInput()", "disableControls()"]
    }
  ]
}
```

### 分析报告示例

```json
{
  "analysis": {
    "components": {
      "detected": 5,
      "types": ["input", "button", "visual"]
    },
    "interactions": {
      "total_probed": 8,
      "successful": 7,
      "with_changes": 4
    },
    "fsm": {
      "extracted_states": 6,
      "extracted_transitions": 5,
      "state_coverage": 0.83,
      "transition_coverage": 0.71
    }
  }
}
```

## 🤝 贡献

欢迎提交 Issues 和 Pull Requests 来改进这个工具！

## 📄 许可证

MIT License
