# FSM 智能提取工具使用指南

## 概述

这个工具实现了你需求中的核心功能：

- ✅ **自动组件检测**: 自动识别页面中的交互元素（按钮、输入框、可视化容器）
- ✅ **行为探测**: 对每个组件进行系统性的交互测试
- ✅ **实际 FSM 重建**: 基于探测结果反向构建页面的真实交互逻辑 FSM
- ✅ **智能对比分析**: 将提取的 FSM 与理想 FSM 进行覆盖率对比

## 文件结构

```
workspace/11-12-0001-fsm-examples copy/
├── fsm-interactive-capture.spec.js  (主要测试文件)
├── html/                           (HTML页面文件)
├── visuals/                        (输出：截图文件)
│   └── [html_filename]/
└── fsm/                           (输出：FSM数据文件)
    └── [html_filename]/
        ├── detected_components.json
        ├── probe_results.json
        ├── extracted_fsm.json
        ├── ideal_fsm.json
        ├── fsm_comparison.json
        └── analysis_report.json
```

## 核心功能模块

### 1. ComponentDetector (组件自动检测器)

- 扫描页面中的所有交互元素
- 识别类型：`input`, `button`, `visual` (canvas/svg 等)
- 记录位置、属性、选择器信息

### 2. BehaviorProber (行为探测器)

- 对每个组件进行系统性测试
- 捕获操作前后的页面状态快照
- 检测显著性变化（DOM 结构、可视元素、文本内容）

### 3. ActualFSMBuilder (实际 FSM 重建器)

- 基于探测结果构建符合理想 FSM 格式的实际 FSM
- 智能语义推断（InsertStart, DeleteStart, Reset 等）
- 生成状态、事件、转换的完整映射

## 输出 FSM 格式

```json
{
  "meta": {
    "concept": "ExtractedFromActualPage",
    "extraction_method": "automated_probing",
    "timestamp": "2025-11-19T..."
  },
  "states": [
    {
      "id": "S0_Idle",
      "label": "Idle",
      "type": "idle",
      "entry_actions": ["renderPage()", "enableControls()"],
      "exit_actions": []
    }
  ],
  "events": [
    {
      "id": "UserClickInsertButton",
      "event_type": "user_action",
      "description": "User clicks Insert button",
      "component": "insertButton",
      "action": "click"
    }
  ],
  "transitions": [
    {
      "from": "S0_Idle",
      "to": "S1_InsertStart",
      "event": "UserClickInsertButton",
      "guard": "inputNotEmpty",
      "actions": ["captureInput()", "disableControls()"],
      "expected_observables": ["dom:insertButtonClicked"],
      "timeout": 2000,
      "actual_changes": {...}
    }
  ],
  "components": ["input", "button", "visual"]
}
```

## 评估指标

### 状态覆盖率

```
State Coverage = (实际FSM中匹配到的理想状态数量) / (理想状态数量)
```

### 转换覆盖率

```
Transition Coverage = (实际可触发的合法转移) / (理想转移数量)
```

### 对比分析输出

```json
{
  "metrics": {
    "state_coverage": {
      "score": 0.85,
      "ideal_states": 6,
      "extracted_states": 5,
      "matched_states": 5,
      "missing_states": ["SearchFound"]
    },
    "transition_coverage": {
      "score": 0.75,
      "ideal_transitions": 8,
      "extracted_transitions": 6
    }
  }
}
```

## 使用方式

### 设置目标 HTML 文件

```bash
# 通过环境变量指定
export TARGET_HTML_FILE="your-bst-page.html"

# 或修改代码中的默认值
const TARGET_HTML_FILE = "65f37f00-b408-11f0-ab52-fbe7249bf639.html";
```

### 运行测试

```bash
# 运行完整的FSM提取和分析
npx playwright test fsm-interactive-capture.spec.js

# 只运行FSM提取
npx playwright test fsm-interactive-capture.spec.js -g "自动FSM提取和重建"

# 只运行对比分析
npx playwright test fsm-interactive-capture.spec.js -g "FSM对比分析"
```

## 输出文件说明

1. **detected_components.json**: 检测到的页面组件详情
2. **probe_results.json**: 每次交互探测的完整记录
3. **extracted_fsm.json**: 从实际页面提取的 FSM 模型
4. **ideal_fsm.json**: 页面中嵌入的理想 FSM 配置
5. **fsm_comparison.json**: FSM 对比分析结果和评分
6. **analysis_report.json**: 完整的分析总结报告

## 特色功能

### 智能语义推断

- 基于按钮文本识别操作类型（insert/delete/search/reset）
- 基于 DOM 变化推断状态转换语义
- 自动生成符合理想 FSM 格式的状态和事件命名

### 全面的变化检测

- DOM 元素数量变化检测
- 可视化结构变化检测
- 表单状态变化检测
- 文本内容变化检测

### 完整的截图记录

- 每次交互前后的完整页面截图
- 按状态和时间顺序组织
- 便于后续的可视化分析

这个工具完全实现了你的需求，可以作为交互式教学 HTML 页面评估系统的核心组件。
