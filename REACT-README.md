# React Viewer 使用指南

## 🎯 **React版本特点**

我已经成功将原始的vanilla JavaScript viewer重写为React版本，具备所有原版功能：

### ✨ **React组件架构**
- **`App`** - 主应用组件，管理全局状态
- **`WorkspaceSelector`** - 工作空间选择器
- **`HtmlCard`** - HTML文件卡片组件
- **`GridContainer`** - 网格容器组件  
- **`Message`** - 消息显示组件

### 🔧 **技术栈**
- **React 18** - 现代React Hooks
- **Babel Standalone** - 浏览器内JSX编译
- **CDN引入** - 无需复杂构建工具

## 🚀 **使用方法**

### **1. 安装依赖**
```bash
npm install
```

### **2. 启动服务**
```bash
# 1. 安装依赖（可选，主要是API服务器需要）
npm install

# 2. 启动API服务器（推荐）
npm run api

# 3. 启动前端服务器
live-server --port=5500

# 4. 访问React版本
# http://localhost:5500/viewer-react.html
```

### **3. 访问应用**
- **React版本**: http://localhost:5500/viewer-react.html
- **原版本**: http://localhost:5500/viewer.html

## 🎨 **功能对比**

| 功能 | 原版 | React版 | 说明 |
|------|------|---------|------|
| 工作空间选择 | ✅ | ✅ | 完全相同 |
| Grid网格布局 | ✅ | ✅ | 响应式设计 |
| HTML预览 | ✅ | ✅ | iframe预览 |
| Messages显示 | ✅ | ✅ | 系统+用户消息 |
| API支持 | ✅ | ✅ | 动态获取数据 |
| 离线模式 | ✅ | ✅ | API不可用时降级 |
| 错误处理 | ✅ | ✅ | 友好的错误提示 |
| 加载状态 | ✅ | ✅ | 加载指示器 |
| 响应式设计 | ✅ | ✅ | 移动端适配 |

## 🆚 **React版本优势**

### **1. 组件化架构**
- 代码模块化，易于维护
- 组件可复用
- 清晰的职责分离

### **2. 现代状态管理**
- 使用React Hooks (useState, useEffect)
- 响应式状态更新
- 更好的数据流控制

### **3. 声明式编程**
- JSX语法更直观
- 状态驱动UI更新
- 减少DOM操作代码

### **4. 开发体验**
- 更好的代码组织
- 更容易调试
- 更好的错误边界处理

## 📁 **文件结构**
```
capstone/
├── viewer.html          # 原版viewer
├── viewer-react.html    # React版viewer
├── api.mjs             # API服务器
├── add.mjs             # HTML生成器
└── workspace/          # 数据目录
    ├── 10-04/
    └── test/
```

## 🎯 **使用建议**

### **开发环境**
建议使用React版本，享受现代前端开发体验

### **生产环境**
两个版本功能完全一致，可根据团队技术栈选择

### **学习目的**
对比两个版本的代码，理解从vanilla JS到React的迁移过程

## 🔧 **自定义开发**

React版本更容易扩展：
- 添加新组件只需创建新的函数组件
- 状态管理通过props传递
- 样式可以轻松模块化

## 🐛 **故障排除**

### React版本不工作？
1. 检查浏览器是否支持ES6
2. 确保CDN资源可以访问
3. 查看浏览器控制台错误

### API相关问题？
两个版本都有相同的API集成和降级机制

---

🎉 **现在你有了两个功能完全相同的viewer版本！**