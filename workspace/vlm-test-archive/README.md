# VLM 测试 - 初始状态截图捕获

这个工具用于批量捕获 HTML 文件的初始状态截图，用于评估 AI 生成的交互式可视化效果。

## 文件结构

```
vlm-test/
├── data/                          # 数据文件
├── html/                          # HTML可视化文件
├── visuals/                       # 生成的截图（自动创建）
│   ├── [html-name-1]/
│   │   └── initial_state.png
│   ├── [html-name-2]/
│   │   └── initial_state.png
│   └── ...
├── batch-capture.spec.js          # 主要的Playwright测试文件
├── playwright.config.js           # Playwright配置
├── run-capture.mjs               # 运行脚本
└── README.md                     # 本文件
```

## 使用方法

### 方法 1: 使用运行脚本（推荐）

```bash
cd workspace/vlm-test
node run-capture.mjs
```

### 方法 2: 直接使用 Playwright

```bash
cd workspace/vlm-test

# 无头模式运行（后台运行，不显示浏览器）
npx playwright test batch-capture.spec.js

# 显示浏览器窗口（可以看到处理过程）
npx playwright test batch-capture.spec.js --headed

# 使用UI模式（推荐用于调试）
npx playwright test batch-capture.spec.js --ui

# 生成HTML报告
npx playwright test batch-capture.spec.js --reporter=html
```

## 功能特性

- ✅ 自动发现`html/`文件夹中的所有 HTML 文件
- ✅ 为每个 HTML 文件创建对应的截图文件夹
- ✅ 捕获完整页面的初始状态截图
- ✅ 错误处理：单个文件失败不影响其他文件处理
- ✅ 进度显示：显示当前处理进度
- ✅ 统计报告：显示成功和失败的文件数量

## 配置说明

### Playwright 配置 (`playwright.config.js`)

- **超时设置**: 60 秒页面加载超时
- **视口大小**: 1920x1080（确保捕获完整内容）
- **浏览器**: 使用 Chromium（保持一致性）
- **并发**: 单线程处理（避免资源冲突）

### 截图设置

- **格式**: PNG
- **类型**: 全页截图（fullPage: true）
- **等待时间**: 2 秒额外等待时间确保页面完全加载

## 输出结果

运行完成后，你会在`visuals/`文件夹中看到：

```
visuals/
├── 45a42250-b3c1-11f0-9577-1b326fe6059a/
│   └── initial_state.png
├── 45b22c10-b3c1-11f0-9577-1b326fe6059a/
│   └── initial_state.png
└── ...
```

每个 HTML 文件都会有一个对应名称的文件夹，包含其初始状态的截图。

## 故障排除

### 常见问题

1. **文件路径错误**

   - 确保在`vlm-test`目录下运行命令
   - 检查`html/`文件夹是否存在且包含 HTML 文件

2. **截图失败**

   - 检查 HTML 文件是否有效
   - 确保有足够的磁盘空间
   - 检查文件权限

3. **Playwright 未安装**
   ```bash
   npm install @playwright/test
   npx playwright install
   ```

### 调试模式

如果需要调试特定问题，可以使用：

```bash
# 调试模式（会暂停在错误处）
npx playwright test batch-capture.spec.js --debug

# 查看详细日志
npx playwright test batch-capture.spec.js --verbose
```

## 扩展功能

如果需要添加更多截图类型（如交互后的状态），可以修改`batch-capture.spec.js`文件，添加更多的截图捕获逻辑。
