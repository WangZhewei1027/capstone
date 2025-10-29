# FSM Visualizer Integration

## 概述

已成功将 FSM (Finite State Machine) 可视化功能集成到 HTML Files Viewer 中。现在你可以通过一个统一的界面查看 HTML 文件并可视化其中的状态机。

## 新功能特性

### 🔄 FSM 可视化

- **交互式状态图**：使用 D3.js 渲染的可拖拽、可交互的状态机图表
- **状态配色**：不同状态使用不同颜色标识，便于区分
- **截图集成**：点击状态节点查看对应的截图
- **状态映射**：智能匹配状态名与截图文件名

### 🎯 用户界面改进

- **双按钮设计**：每个 HTML 文件卡片现在有两个按钮
  - "查看页面"：在新标签页中打开原始 HTML 文件
  - "FSM 可视化"：打开 FSM 可视化模态框
- **模态框设计**：全屏 FSM 可视化界面，不干扰主要的文件浏览
- **响应式布局**：适配不同屏幕尺寸

### 📊 数据展示

- **FSM 信息面板**：显示状态数、事件数、截图数等统计信息
- **操作说明**：内置帮助信息指导用户操作
- **截图预览**：点击状态节点或"查看所有截图"按钮浏览截图

## API 集成

### 新增端点

已将原`fsm-api.mjs`的功能集成到主`api.mjs`中：

- `GET /api/fsm-data/:workspace/:filename` - 获取 HTML 文件中的 FSM 配置
- `GET /api/screenshots/:workspace/:filename` - 获取对应的截图列表

### 数据提取

- 自动从 HTML 文件的`<script type="application/json">`标签中提取 FSM 配置
- 智能匹配截图文件名与状态名
- 支持多种文件命名模式

## 启动方式

### 方法 1：使用批处理文件

```bash
./start-viewer.bat
```

### 方法 2：使用 npm 脚本

```bash
npm run viewer
```

### 方法 3：手动启动

```bash
# 启动API服务器
node api.mjs

# 在浏览器中打开viewer-react.html
```

## 技术架构

### 前端组件

- **FSMVisualizerModal**：主要的 FSM 可视化模态框组件
- **FSMGraph**：使用 D3.js 的状态图渲染组件
- **ScreenshotPanel**：截图展示面板组件
- **HtmlCard**：增强的文件卡片组件（新增 FSM 按钮）

### 后端集成

- 将 FSM API 功能合并到主 API 服务器
- 统一的 CORS 配置和静态文件服务
- 智能的状态名提取算法

### 状态配色方案

```javascript
const STATE_COLORS = {
  idle: "#4caf50", // 绿色
  validating_input: "#ff9800", // 橙色
  error_alert: "#f44336", // 红色
  inserting_node: "#2196f3", // 蓝色
  drawing_tree: "#9c27b0", // 紫色
  tree_resetting: "#607d8b", // 灰蓝色
};
```

## 使用流程

1. **启动服务**：运行`start-viewer.bat`或`npm run viewer`
2. **选择工作空间**：在下拉菜单中选择要查看的工作空间
3. **浏览文件**：查看工作空间中的 HTML 文件卡片
4. **查看 FSM**：点击任意文件的"FSM 可视化"按钮
5. **探索状态**：在状态图中点击节点查看对应截图
6. **拖拽布局**：可以拖拽状态节点调整图表布局

## 文件结构

```
capstone/
├── api.mjs                 # 主API服务器（已集成FSM功能）
├── viewer-react.html       # 主界面（已集成FSM可视化）
├── start-viewer.bat       # 一键启动脚本
├── fsm-api.mjs            # [已弃用] 原FSM API服务器
├── fsm-visualizer.html    # [已弃用] 独立FSM可视化器
└── workspace/
    └── [workspace-name]/
        ├── html/           # HTML文件
        ├── data/           # 数据文件
        └── visuals/        # 截图文件
```

## 兼容性

- **浏览器**：支持现代浏览器（Chrome, Firefox, Safari, Edge）
- **React 版本**：使用 React 18 CDN 版本
- **D3.js 版本**：使用 D3.js v7
- **API 版本**：与现有的工作空间 API 完全兼容

## 故障排除

### 常见问题

1. **FSM 数据无法加载**：确保 HTML 文件包含`<script type="application/json">`标签
2. **截图不显示**：检查`workspace/[workspace]/visuals/[file-id]/`目录是否存在
3. **API 连接失败**：确保 API 服务器在端口 3000 运行

### 调试提示

- 打开浏览器开发者工具查看控制台错误
- 检查网络标签页确认 API 请求状态
- 验证文件路径和权限设置

## 下一步计划

- [ ] 添加状态转换动画效果
- [ ] 支持 FSM 配置的在线编辑
- [ ] 增加更多的图表布局算法
- [ ] 导出状态图为图片格式
- [ ] 添加状态执行历史回放功能
