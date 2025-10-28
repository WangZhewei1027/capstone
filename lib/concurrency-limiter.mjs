// 并发控制工具函数 - 简化版本
export async function concurrentLimit(tasks, limit) {
  const results = [];

  // 分批处理任务
  for (let i = 0; i < tasks.length; i += limit) {
    const batch = tasks.slice(i, i + limit);
    const batchPromises = batch.map((task) =>
      task().catch((error) => ({ error, status: "rejected" }))
    );

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  return results;
}

// 更简单的并发控制实现
export class ConcurrencyLimiter {
  constructor(limit) {
    this.limit = limit;
    this.running = 0;
    this.queue = [];
  }

  async add(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({
        task,
        resolve,
        reject,
      });
      this.process();
    });
  }

  async process() {
    if (this.running >= this.limit || this.queue.length === 0) {
      return;
    }

    this.running++;
    const { task, resolve, reject } = this.queue.shift();

    try {
      const result = await task();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.running--;
      this.process();
    }
  }
}
