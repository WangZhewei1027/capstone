import { promises as fs } from "fs";

class ConcurrentFileWriter {
  constructor() {
    this.queues = new Map(); // 文件路径 -> 操作队列
  }

  // 为每个文件维护一个操作队列，确保写入操作的顺序性
  async writeToFile(filename, operation) {
    if (!this.queues.has(filename)) {
      this.queues.set(filename, Promise.resolve());
    }

    const queue = this.queues.get(filename);

    const newQueue = queue
      .then(() => operation())
      .catch((err) => {
        console.error(`文件操作失败 ${filename}:`, err);
        throw err;
      });

    this.queues.set(filename, newQueue);

    return await newQueue;
  }

  // 安全地追加数据到 JSON 文件
  async appendToJsonFile(filename, newData) {
    return this.writeToFile(filename, async () => {
      let existingData = [];

      // 确保目录存在
      try {
        const dir = filename.substring(0, filename.lastIndexOf("/"));
        if (dir) {
          await fs.mkdir(dir, { recursive: true });
        }
      } catch (err) {
        console.error("创建数据目录时出错：", err);
      }

      // 读取现有数据
      try {
        const fileContent = await fs.readFile(filename, "utf-8");
        existingData = JSON.parse(fileContent) || [];
        if (!Array.isArray(existingData)) {
          existingData = [];
        }
      } catch (err) {
        // 文件不存在或无效，使用空数组
        existingData = [];
      }

      // 添加新数据
      existingData.push(newData);

      // 写回文件
      await fs.writeFile(filename, JSON.stringify(existingData, null, 2));

      return newData;
    });
  }

  // 安全地写入单个文件
  async writeFile(filename, content) {
    return this.writeToFile(filename, async () => {
      // 确保目录存在
      const dir = filename.substring(0, filename.lastIndexOf("/"));
      if (dir) {
        await fs.mkdir(dir, { recursive: true });
      }

      await fs.writeFile(filename, content);
    });
  }
}

// 创建全局单例
export const fileWriter = new ConcurrentFileWriter();
