# 视觉评估系统 (Visual Evaluation System)

这是一个基于 AI 的 HTML 应用视觉质量评估系统，可以自动分析截图并生成详细的评估报告。

## 系统架构

```
visual-evaluator.mjs    # 核心评估引擎
api.mjs                 # API服务器（新增评估接口）
viewer-react.html       # 前端界面（新增评估按钮和模态框）
test-visual-evaluator.mjs # 测试脚本
```

## 功能特点

### 🎯 评估维度

- **布局质量**: 页面元素排列、视觉层次、色彩搭配
- **内容丰富度**: 信息完整性、交互元素多样性、教育价值
- **交互逻辑**: 操作流程连贯性、状态转换清晰度、用户反馈

### 📸 截图分析

- 自动识别初始状态截图（文件名包含"initial"或"empty"）
- 自动识别完成状态截图（文件名包含"complete"或"final"）
- 智能分析交互过程截图
- 支持错误状态截图分析

### 🤖 AI 驱动

- 使用 GPT-4 Vision API 进行深度视觉分析
- 智能图片选择以优化 token 使用
- 结构化评分和详细分析报告

## 快速开始

### 1. 环境准备

```bash
# 设置API Key和基础URL（与add-core.mjs相同配置）
export OPENAI_API_KEY=your-api-key-here
export OPENAI_BASE_URL=https://你的newapi服务器地址/v1

# 安装依赖（如果需要）
npm install openai dotenv
```

### 2. 测试 API 连接

```bash
# 首先测试API连接
node test-api-connection.mjs
```

### 3. 运行测试

```bash
# 运行完整测试脚本
node test-visual-evaluator.mjs
```

### 4. 单独评估

```bash
# 评估单个HTML文件
node visual-evaluator.mjs vlm-test 65f023a0-b408-11f0-ab52-fbe7249bf639

# 批量评估整个工作空间
node visual-evaluator.mjs vlm-test
```

### 5. 通过 API 使用

```bash
# 启动API服务器
node api.mjs

# 获取评估结果
curl http://localhost:3000/api/evaluation/vlm-test/65f023a0-b408-11f0-ab52-fbe7249bf639.html

# 执行新评估
curl -X POST http://localhost:3000/api/evaluation/vlm-test/65f023a0-b408-11f0-ab52-fbe7249bf639.html
```

### 6. 前端界面使用

1. 启动 API 服务器: `node api.mjs`
2. 打开 `viewer-react.html` 在浏览器中
3. 选择工作空间
4. 点击任意卡片上的"视觉评估"按钮
5. 查看评估结果或执行新评估

## 输出格式

评估结果保存为 JSON 文件，包含以下信息：

```json
{
  "overall_score": 8.5,
  "layout_quality": 8.2,
  "content_richness": 8.8,
  "interaction_logic": 8.5,
  "analysis": "详细分析文本...",
  "strengths": ["优点1", "优点2", "优点3"],
  "weaknesses": ["缺点1", "缺点2"],
  "recommendations": ["建议1", "建议2", "建议3"],
  "metadata": {
    "workspace": "vlm-test",
    "htmlFileName": "65f023a0-b408-11f0-ab52-fbe7249bf639",
    "evaluatedAt": "2025-10-29T...",
    "screenshotCount": 57,
    "appTitle": "Interactive Binary Search Tree",
    "hasFSM": true,
    "interactionElements": 3
  }
}
```

## 文件命名规范

为了更好的评估效果，建议截图文件命名遵循以下规范：

### 状态相关

- `001_01_initial_state.png` - 初始状态
- `999_01_complete_state.png` - 完成状态
- `error_alert_state.png` - 错误状态

### 操作相关

- `002_01_add_front_A.png` - 添加到前端
- `003_01_remove_back.png` - 从后端移除
- `004_validating_input.png` - 输入验证

## 技术细节

### 图片处理

- 自动压缩图片为低分辨率以节省 tokens
- 智能选择关键截图（最多 13 张）
- 支持 PNG 格式截图

### API 集成

- 使用兼容 OpenAI 格式的 API 服务器（与 add-core.mjs 相同配置）
- 支持 gpt-4o-mini 等模型进行图像分析
- 标准 OpenAI API 格式（messages 字段）
- 错误处理和重试机制

### 前端界面

- React 组件化架构
- 响应式设计
- 实时加载状态显示

## 故障排除

### 常见问题

1. **API Key 错误**

   ```bash
   export OPENAI_API_KEY=your-actual-newapi-key
   export OPENAI_BASE_URL=https://你的newapi服务器地址/v1
   ```

2. **截图目录不存在**
   确保 `workspace/{workspace}/visuals/{htmlFile}/` 目录存在并包含 PNG 文件

3. **API 服务器未启动**
   确保运行 `node api.mjs` 并且端口 3000 可用

4. **评估失败**
   检查网络连接和自制 API 服务器状态，以及 API 额度

### 调试模式

```bash
# 设置调试模式
export DEBUG=visual-evaluator
node visual-evaluator.mjs vlm-test
```

## 扩展开发

### 添加新的评估维度

1. 在 `generateEvaluationPrompt` 中添加新的评估标准
2. 更新评估结果 JSON 结构
3. 在前端界面添加对应的显示组件

### 支持新的截图格式

1. 更新 `categorizeScreenshots` 方法
2. 添加新的文件名匹配规则
3. 测试确保兼容性

### 集成其他 AI 模型

1. 修改 `generateAIEvaluation` 方法
2. 调整 prompt 格式
3. 更新错误处理逻辑

## 贡献指南

欢迎提交问题和改进建议！请确保：

1. 代码遵循项目风格
2. 添加适当的错误处理
3. 更新相关文档
4. 提供测试用例

## 许可证

此项目仅供学习和研究使用。
