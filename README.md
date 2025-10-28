## 使用方法

### 安装

用的node v20

npm install安装所有包

### add.mjs

node add.mjs -h 来查看帮助

使用方法一：

手动按提示操作：node add.mjs

使用方法二：

一次性输入参数：

read

### batch-add.mjs

批量执行add.mjs的脚本

### 可视化查看面板：

# 1. 安装依赖
npm install

# 2. 启动API服务器
npm run api

# 3. 启动前端服务器
启动liver server

# 4. 访问React版本
http://localhost:5500/viewer-react.html


## 注意事项

不要手动查看或保存html！！！VS Code的自动格式化可能搞坏一些东西


# 显示浏览器窗口
npx playwright test workspace/10-28-0004/tests/ --headed

# 使用 UI 模式（推荐）
npx playwright test workspace/10-28-0004/tests/ --ui

# 调试模式
npx playwright test workspace/10-28-0004/tests/ --debug

# 只运行特定浏览器
npx playwright test workspace/10-28-0004/tests/ --project=chromium

# 并行运行（指定 worker 数量）
npx playwright test workspace/10-28-0004/tests/ --workers=4

# 生成 HTML 报告
npx playwright test workspace/10-28-0004/tests/ --reporter=html



# 运行指定文件夹下的所有测试
npx playwright test workspace/10-28-0004/tests/

# 或者使用相对路径
npx playwright test ./workspace/10-28-0004/tests/

# 使用通配符
npx playwright test workspace/10-28-0004/tests/*.spec.js

