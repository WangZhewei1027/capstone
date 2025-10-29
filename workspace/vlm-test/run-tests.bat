@echo off
setlocal

echo.
echo ============================================
echo        🧪 通用FSM测试工具启动器
echo ============================================
echo.

:: 检查Node.js是否安装
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: Node.js 未安装或不在PATH中
    echo 请先安装 Node.js: https://nodejs.org/
    pause
    exit /b 1
)

:: 检查Playwright是否安装
npx playwright --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: Playwright 未安装
    echo 正在安装 Playwright...
    npm install -D @playwright/test
    npx playwright install
)

:: 进入正确的目录
cd /d "d:\largeProjects\CS-Capstone\capstone\workspace\vlm-test"

:: 运行测试菜单
echo 启动测试菜单...
echo.
node test-runner.mjs

pause