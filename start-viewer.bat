@echo off
echo 启动集成了FSM可视化功能的HTML查看器...
echo.
echo 1. 启动API服务器...
start /B node api.mjs
echo.
echo 2. 等待API服务器启动...
timeout /t 3 /nobreak >nul
echo.
echo 3. 打开浏览器...
start viewer-react.html
echo.
echo ✅ 所有服务已启动！
echo.
echo 📡 API服务器运行在: http://localhost:3000
echo 🌐 前端页面已在浏览器中打开
echo.
echo 功能说明:
echo • 选择工作空间查看HTML文件
echo • 点击"查看页面"查看原始HTML
echo • 点击"FSM 可视化"查看状态机图表和截图
echo.
echo 按任意键退出...
pause >nul