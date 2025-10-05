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

node add.mjs --workspace "10-04" --model "gpt-4o-mini" --question "bubble sort" --system "Generate a single HTML file with JavaScript demonstrating the user-given concept. Only respond in a single HTML file."

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


