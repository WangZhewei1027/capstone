import express from "express";
import { promises as fs } from "fs";
import path from "path";
import cors from "cors";

const app = express();
const PORT = 3000;

// 启用 CORS，允许前端访问
app.use(cors());
app.use(express.json());

// 静态文件服务 - 提供workspace文件夹的访问
app.use("/workspace", express.static("./workspace"));

// 获取所有工作空间列表
app.get("/api/workspaces", async (req, res) => {
  try {
    const workspacePath = "./workspace";

    // 检查workspace目录是否存在
    try {
      await fs.access(workspacePath);
    } catch (error) {
      return res.json([]);
    }

    const items = await fs.readdir(workspacePath, { withFileTypes: true });

    // 筛选出文件夹，并检查每个文件夹是否包含必要的子目录
    const workspaces = [];

    for (const item of items) {
      if (item.isDirectory()) {
        const workspaceName = item.name;
        const workspaceFullPath = path.join(workspacePath, workspaceName);

        // 检查是否包含data和html目录
        try {
          const dataPath = path.join(workspaceFullPath, "data");
          const htmlPath = path.join(workspaceFullPath, "html");

          await fs.access(dataPath);
          await fs.access(htmlPath);

          // 检查是否有data.json文件
          const dataJsonPath = path.join(dataPath, "data.json");
          await fs.access(dataJsonPath);

          workspaces.push({
            name: workspaceName,
            path: workspaceName,
            hasData: true,
            hasHtml: true,
          });
        } catch (error) {
          // 如果目录结构不完整，仍然添加但标记为不完整
          workspaces.push({
            name: workspaceName,
            path: workspaceName,
            hasData: false,
            hasHtml: false,
          });
        }
      }
    }

    res.json(workspaces);
  } catch (error) {
    console.error("获取工作空间列表失败:", error);
    res.status(500).json({
      error: "获取工作空间列表失败",
      message: error.message,
    });
  }
});

// 获取指定工作空间的数据
app.get("/api/workspaces/:workspace/data", async (req, res) => {
  try {
    const { workspace } = req.params;
    const dataPath = `./workspace/${workspace}/data/data.json`;

    const data = await fs.readFile(dataPath, "utf-8");
    const jsonData = JSON.parse(data);

    res.json(jsonData);
  } catch (error) {
    console.error("获取工作空间数据失败:", error);
    res.status(500).json({
      error: "获取工作空间数据失败",
      message: error.message,
    });
  }
});

// 获取指定工作空间的HTML文件列表
app.get("/api/workspaces/:workspace/html", async (req, res) => {
  try {
    const { workspace } = req.params;
    const htmlPath = `./workspace/${workspace}/html`;

    const files = await fs.readdir(htmlPath);
    const htmlFiles = files
      .filter((file) => file.endsWith(".html"))
      .map((file) => ({
        name: file,
        id: file.replace(".html", ""),
        url: `/workspace/${workspace}/html/${file}`,
      }));

    res.json(htmlFiles);
  } catch (error) {
    console.error("获取HTML文件列表失败:", error);
    res.status(500).json({
      error: "获取HTML文件列表失败",
      message: error.message,
    });
  }
});

// 获取工作空间统计信息
app.get("/api/workspaces/:workspace/stats", async (req, res) => {
  try {
    const { workspace } = req.params;
    const dataPath = `./workspace/${workspace}/data/data.json`;
    const htmlPath = `./workspace/${workspace}/html`;

    // 读取数据文件
    const data = await fs.readFile(dataPath, "utf-8");
    const jsonData = JSON.parse(data);

    // 读取HTML文件
    const htmlFiles = await fs.readdir(htmlPath);
    const htmlCount = htmlFiles.filter((file) => file.endsWith(".html")).length;

    // 统计模型使用情况
    const modelStats = {};
    jsonData.forEach((item) => {
      modelStats[item.model] = (modelStats[item.model] || 0) + 1;
    });

    // 获取最新和最旧的记录
    const timestamps = jsonData.map((item) => new Date(item.timestamp));
    const newest =
      timestamps.length > 0 ? new Date(Math.max(...timestamps)) : null;
    const oldest =
      timestamps.length > 0 ? new Date(Math.min(...timestamps)) : null;

    res.json({
      workspace,
      totalEntries: jsonData.length,
      htmlFiles: htmlCount,
      modelStats,
      dateRange: {
        newest: newest ? newest.toISOString() : null,
        oldest: oldest ? oldest.toISOString() : null,
      },
    });
  } catch (error) {
    console.error("获取工作空间统计失败:", error);
    res.status(500).json({
      error: "获取工作空间统计失败",
      message: error.message,
    });
  }
});

// 健康检查接口
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 API服务器运行在 http://localhost:${PORT}`);
  console.log(`📡 可用的API端点:`);
  console.log(`   GET /api/workspaces - 获取所有工作空间`);
  console.log(`   GET /api/workspaces/:workspace/data - 获取工作空间数据`);
  console.log(`   GET /api/workspaces/:workspace/html - 获取HTML文件列表`);
  console.log(`   GET /api/workspaces/:workspace/stats - 获取工作空间统计`);
  console.log(`   GET /api/health - 健康检查`);
  console.log(
    `💻 前端可以通过 http://localhost:${PORT}/workspace/ 访问静态文件`
  );
});

export default app;
