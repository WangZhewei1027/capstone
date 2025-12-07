#!/usr/bin/env node
/**
 * Batch Similarity Evaluation - 批量FSM相似度评估工具
 *
 * 遍历workspace/fsm文件夹中的所有FSM JSON文件，
 * 根据concept名称匹配ideal-fsm中对应的理想FSM，
 * 使用fsm-similarity.mjs进行相似度比较，
 * 将所有比较结果储存到统一的JSON文件中
 */

import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load concept categories mapping
 */
let CONCEPT_CATEGORIES = {};
async function loadConceptCategories() {
  try {
    const categoriesPath = path.join(__dirname, "concept-categories.json");
    const data = await fs.readFile(categoriesPath, "utf-8");
    const categories = JSON.parse(data);

    // Create reverse mapping: concept -> category
    for (const [category, concepts] of Object.entries(categories)) {
      for (const concept of concepts) {
        CONCEPT_CATEGORIES[concept.toLowerCase()] = category;
      }
    }
  } catch (error) {
    console.warn("⚠️ 无法加载概念分类映射，将使用默认分类");
  }
}

/**
 * Get category for a concept
 */
function getCategoryForConcept(concept) {
  const normalized = concept.toLowerCase().trim();
  return CONCEPT_CATEGORIES[normalized] || "Other";
}

/**
 * 并发限制器 - 控制同时运行的任务数量
 */
class ConcurrencyLimiter {
  constructor(limit = 5) {
    this.limit = limit;
    this.running = 0;
    this.queue = [];
  }

  async add(asyncFunction) {
    return new Promise((resolve, reject) => {
      this.queue.push({
        asyncFunction,
        resolve,
        reject,
      });
      this.tryNext();
    });
  }

  async tryNext() {
    if (this.running >= this.limit || this.queue.length === 0) {
      return;
    }

    this.running++;
    const { asyncFunction, resolve, reject } = this.queue.shift();

    try {
      const result = await asyncFunction();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.running--;
      this.tryNext();
    }
  }
}

/**
 * 加载FSM相似度比较库
 */
async function loadSimilarityLibrary() {
  try {
    const libraryPath = path.join(__dirname, "lib", "fsm-similarity.mjs");
    const libraryUrl = `file://${libraryPath.replace(/\\/g, "/")}`;
    const { compareFSMs } = await import(libraryUrl);
    return compareFSMs;
  } catch (error) {
    throw new Error(`无法加载相似度计算库: ${error.message}`);
  }
}

/**
 * 从FSM JSON文件中提取concept名称
 */
async function extractConceptFromFsm(fsmFilePath) {
  try {
    const fsmContent = await fs.readFile(fsmFilePath, "utf-8");
    const fsmData = JSON.parse(fsmContent);

    // 尝试多种可能的concept字段
    const concept =
      fsmData.meta?.concept ||
      fsmData.concept ||
      fsmData.meta?.topic ||
      fsmData.topic ||
      fsmData.meta?.educational_goal ||
      null;

    if (!concept) {
      throw new Error("未找到concept字段");
    }

    return concept;
  } catch (error) {
    throw new Error(`提取concept失败: ${error.message}`);
  }
}

/**
 * 根据concept名称查找对应的ideal FSM文件
 */
async function findIdealFsmFile(idealFsmDir, concept) {
  try {
    const idealFsmFiles = await fs.readdir(idealFsmDir);

    // 规范化concept名称以便匹配
    const normalizedConcept = concept.trim();

    // 将驼峰命名法转换为下划线分隔
    const camelToSnake = (str) => {
      return str.replace(/([a-z])([A-Z])/g, "$1_$2");
    };

    // 将下划线分隔转换为驼峰命名法
    const snakeToCamel = (str) => {
      return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
    };

    // 生成所有可能的匹配模式
    const possibleNames = [
      // 完全匹配
      `${normalizedConcept}.json`,

      // 驼峰到下划线转换
      `${camelToSnake(normalizedConcept)}.json`,
      `${camelToSnake(normalizedConcept).toLowerCase()}.json`,

      // 下划线到驼峰转换（防御性）
      `${snakeToCamel(normalizedConcept)}.json`,
      `${snakeToCamel(normalizedConcept.toLowerCase())}.json`,

      // 空格替换
      `${normalizedConcept.replace(/\s+/g, "_")}.json`,
      `${normalizedConcept.replace(/\s+/g, "")}.json`,
      `${normalizedConcept.replace(/\s+/g, "-")}.json`,

      // 小写版本
      `${normalizedConcept.toLowerCase()}.json`,
      `${normalizedConcept.toLowerCase().replace(/\s+/g, "_")}.json`,
      `${normalizedConcept.toLowerCase().replace(/\s+/g, "")}.json`,
      `${normalizedConcept.toLowerCase().replace(/\s+/g, "-")}.json`,

      // 特殊处理：常见算法名称映射
      ...getSpecialMappings(normalizedConcept),
    ];

    // 移除重复项
    const uniqueNames = [...new Set(possibleNames)];

    console.log(
      `     🔍 尝试匹配: ${normalizedConcept} -> [${uniqueNames
        .slice(0, 5)
        .join(", ")}...]`
    );

    // 查找精确匹配的文件
    for (const possibleName of uniqueNames) {
      if (idealFsmFiles.includes(possibleName)) {
        console.log(`     ✅ 精确匹配: ${possibleName}`);
        return path.join(idealFsmDir, possibleName);
      }
    }

    // 如果精确匹配失败，尝试模糊匹配
    console.log(`     🔄 尝试模糊匹配...`);

    const conceptLower = normalizedConcept.toLowerCase();
    const conceptSnake = camelToSnake(normalizedConcept).toLowerCase();

    for (const file of idealFsmFiles) {
      const baseName = path.basename(file, ".json").toLowerCase();

      // 多种模糊匹配策略
      if (
        baseName === conceptLower ||
        baseName === conceptSnake ||
        baseName.includes(conceptLower) ||
        conceptLower.includes(baseName) ||
        baseName.includes(conceptSnake) ||
        conceptSnake.includes(baseName) ||
        // 检查去掉特殊字符后的匹配
        baseName.replace(/[^a-z0-9]/g, "") ===
          conceptLower.replace(/[^a-z0-9]/g, "") ||
        // 检查单词匹配
        wordsMatch(conceptLower, baseName)
      ) {
        console.log(`     ✅ 模糊匹配: ${normalizedConcept} -> ${file}`);
        return path.join(idealFsmDir, file);
      }
    }

    console.log(
      `     ❌ 未找到匹配，可用文件: ${idealFsmFiles
        .slice(0, 10)
        .join(", ")}...`
    );
    throw new Error(`未找到匹配的ideal FSM文件`);
  } catch (error) {
    throw new Error(`查找ideal FSM失败: ${error.message}`);
  }
}

/**
 * 获取特殊概念名称映射
 */
function getSpecialMappings(concept) {
  const mappings = {
    LinkedList: ["Linked_List.json"],
    BinarySearchTree: ["Binary_Search_Tree__BST_.json"],
    BinarySearch: ["Binary_Search.json"],
    BinaryTree: ["Binary_Tree.json"],
    BubbleSort: ["Bubble_Sort.json"],
    InsertionSort: ["Insertion_Sort.json"],
    SelectionSort: ["Selection_Sort.json"],
    MergeSort: ["Merge_Sort.json"],
    QuickSort: ["Quick_Sort.json"],
    HeapSort: ["Heap_Sort.json"],
    RadixSort: ["Radix_Sort.json"],
    CountingSort: ["Counting_Sort.json"],
    TopologicalSort: ["Topological_Sort.json"],
    DepthFirstSearch: ["Depth_First_Search__DFS_.json"],
    BreadthFirstSearch: ["Breadth_First_Search__BFS_.json"],
    DijkstraAlgorithm: ["Dijkstra_s_Algorithm.json"],
    BellmanFordAlgorithm: ["Bellman_Ford_Algorithm.json"],
    FloydWarshallAlgorithm: ["Floyd_Warshall_Algorithm.json"],
    KruskalAlgorithm: ["Kruskal_s_Algorithm.json"],
    PrimAlgorithm: ["Prim_s_Algorithm.json"],
    HashTable: ["Hash_Table.json"],
    HashMap: ["Hash_Map.json"],
    PriorityQueue: ["Priority_Queue.json"],
    UnionFind: ["Union_Find__Disjoint_Set_.json"],
    DisjointSet: ["Union_Find__Disjoint_Set_.json"],
    RedBlackTree: ["Red_Black_Tree.json"],
    AdjacencyList: ["Adjacency_List.json"],
    AdjacencyMatrix: ["Adjacency_Matrix.json"],
    WeightedGraph: ["Weighted_Graph.json"],
    DirectedGraph: ["Graph__Directed_Undirected_.json"],
    UndirectedGraph: ["Graph__Directed_Undirected_.json"],
    Graph: ["Graph__Directed_Undirected_.json"],
    MinHeap: ["Heap__Min_Max_.json"],
    MaxHeap: ["Heap__Min_Max_.json"],
    Heap: ["Heap__Min_Max_.json"],
    KNearestNeighbors: ["K_Nearest_Neighbors__KNN_.json"],
    KNN: ["K_Nearest_Neighbors__KNN_.json"],
    KMeansClustering: ["K_Means_Clustering.json"],
    LinearRegression: ["Linear_Regression.json"],
    LinearSearch: ["Linear_Search.json"],
    TwoPointers: ["Two_Pointers.json"],
    SlidingWindow: ["Sliding_Window.json"],
    DivideAndConquer: ["Divide_and_Conquer.json"],
    FibonacciSequence: ["Fibonacci_Sequence.json"],
    HuffmanCoding: ["Huffman_Coding.json"],
    KnapsackProblem: ["Knapsack_Problem.json"],
    LongestCommonSubsequence: ["Longest_Common_Subsequence.json"],
  };

  return mappings[concept] || [];
}

/**
 * 检查两个字符串是否有相同的单词
 */
function wordsMatch(str1, str2) {
  const words1 = str1.split(/[^a-z0-9]+/).filter((w) => w.length > 2);
  const words2 = str2.split(/[^a-z0-9]+/).filter((w) => w.length > 2);

  for (const word1 of words1) {
    for (const word2 of words2) {
      if (word1 === word2 || word1.includes(word2) || word2.includes(word1)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * 批量FSM相似度评估主函数
 */
async function runBatchSimilarityEval(workspaceName) {
  // Load concept categories first
  await loadConceptCategories();

  const workspacePath = path.join("workspace", workspaceName);
  const fsmDir = path.join(workspacePath, "fsm");
  const idealFsmDir = path.join(workspacePath, "ideal-fsm");
  const outputFile = path.join(workspacePath, "fsm-similarity-results.json");

  console.log(`
╔════════════════════════════════════════════════════════════════════════╗
║  批量FSM相似度评估器 - Batch FSM Similarity Evaluator                 ║
╚════════════════════════════════════════════════════════════════════════╝

工作空间: ${workspaceName}
FSM目录: ${fsmDir}
理想FSM目录: ${idealFsmDir}
输出文件: ${outputFile}
`);

  // 检查目录是否存在
  try {
    await fs.access(fsmDir);
  } catch (error) {
    throw new Error(`FSM目录不存在: ${fsmDir}`);
  }

  try {
    await fs.access(idealFsmDir);
  } catch (error) {
    throw new Error(`理想FSM目录不存在: ${idealFsmDir}`);
  }

  // 加载相似度计算库
  console.log("🔧 加载相似度计算库...");
  const compareFSMs = await loadSimilarityLibrary();

  // 获取所有FSM文件
  console.log("📁 扫描FSM文件...");
  const fsmFiles = (await fs.readdir(fsmDir))
    .filter((file) => file.endsWith(".json"))
    .map((file) => ({
      fileName: file,
      filePath: path.join(fsmDir, file),
    }));

  if (fsmFiles.length === 0) {
    throw new Error(`FSM目录中没有找到JSON文件: ${fsmDir}`);
  }

  console.log(`找到 ${fsmFiles.length} 个FSM文件`);

  // 初始化并发限制器
  const limiter = new ConcurrencyLimiter(3); // 降低并发数以避免过多输出

  // 统计信息
  const stats = {
    total: fsmFiles.length,
    completed: 0,
    success: 0,
    failed: 0,
    matched: 0,
    unmatched: 0,
    startTime: Date.now(),
  };

  // 结果收集
  const results = [];

  // 创建相似度评估任务
  const tasks = fsmFiles.map((fsmFile, index) => {
    return limiter.add(async () => {
      const taskId = `Task-${(index + 1).toString().padStart(3, "0")}`;

      console.log(`🔍 [${taskId}] 处理: ${fsmFile.fileName}`);

      try {
        // 1. 从FSM文件中提取concept
        const concept = await extractConceptFromFsm(fsmFile.filePath);
        console.log(`   📝 Concept: ${concept}`);

        // 1.5 读取对应的data文件获取model和category信息
        const dataDir = path.join(workspacePath, "data");
        const fileId = fsmFile.fileName.replace(".json", "");
        const dataFilePath = path.join(dataDir, `${fileId}.json`);
        let model = "unknown";
        let category = "Unknown";

        try {
          const dataContent = await fs.readFile(dataFilePath, "utf-8");
          const dataFile = JSON.parse(dataContent);
          model = dataFile.model || "unknown";
          // Get category based on concept
          category = getCategoryForConcept(concept);
          console.log(`   🤖 Model: ${model}, Category: ${category}`);
        } catch (error) {
          console.warn(`   ⚠️  无法读取data文件，使用默认值`);
        }

        // 2. 查找对应的ideal FSM文件
        const idealFsmPath = await findIdealFsmFile(idealFsmDir, concept);
        const idealFsmFileName = path.basename(idealFsmPath);
        console.log(`   🎯 匹配到理想FSM: ${idealFsmFileName}`);

        stats.matched++;

        // 3. 读取两个FSM文件
        const fsmContent = await fs.readFile(fsmFile.filePath, "utf-8");
        const fsmData = JSON.parse(fsmContent);

        const idealFsmContent = await fs.readFile(idealFsmPath, "utf-8");
        const idealFsmData = JSON.parse(idealFsmContent);

        // 4. 进行相似度比较
        console.log(`   ⚡ 计算相似度...`);
        const similarityResult = compareFSMs(fsmData, idealFsmData);

        stats.success++;

        const similarity = Math.round(
          similarityResult.combined_similarity * 100
        );
        console.log(
          `✅ [${taskId}] ${fsmFile.fileName} - 相似度: ${similarity}%`
        );
        console.log(
          `   📊 结构: ${Math.round(
            similarityResult.structural_similarity.overall * 100
          )}% | 语义: ${Math.round(
            similarityResult.semantic_similarity.overall * 100
          )}% | 同构: ${Math.round(
            similarityResult.isomorphism_similarity * 100
          )}%`
        );

        // 5. 保存结果
        results.push({
          taskId,
          fsmFileName: fsmFile.fileName,
          concept,
          model,
          category,
          idealFsmFileName,
          matched: true,
          success: true,
          similarityResult,
          summary: {
            combined_similarity: similarityResult.combined_similarity,
            structural_similarity:
              similarityResult.structural_similarity.overall,
            semantic_similarity: similarityResult.semantic_similarity.overall,
            isomorphism_similarity: similarityResult.isomorphism_similarity,
            score: similarity,
            interpretation: similarityResult.summary.interpretation,
          },
        });
      } catch (error) {
        const isMatchError = error.message.includes("未找到匹配");

        if (isMatchError) {
          stats.unmatched++;
          console.warn(
            `⚠️  [${taskId}] ${fsmFile.fileName} - ${error.message}`
          );
        } else {
          stats.failed++;
          console.error(
            `❌ [${taskId}] ${fsmFile.fileName} - 失败: ${error.message}`
          );
        }

        results.push({
          taskId,
          fsmFileName: fsmFile.fileName,
          concept: null,
          idealFsmFileName: null,
          matched: !isMatchError,
          success: false,
          error: error.message,
          similarityResult: null,
        });
      } finally {
        stats.completed++;
        const progress = ((stats.completed / stats.total) * 100).toFixed(1);
        console.log(
          `📊 进度: ${stats.completed}/${stats.total} (${progress}%)\n`
        );
      }
    });
  });

  // 执行所有任务
  console.log(`⚡ 开始处理 ${fsmFiles.length} 个FSM文件...\n`);

  try {
    await Promise.all(tasks);
  } catch (error) {
    console.error(`批量处理过程中发生错误: ${error.message}`);
  }

  // 计算统计信息
  const successfulResults = results.filter(
    (r) => r.success && r.similarityResult
  );
  const avgSimilarity =
    successfulResults.length > 0
      ? successfulResults.reduce(
          (sum, r) => sum + r.similarityResult.combined_similarity,
          0
        ) / successfulResults.length
      : 0;

  const similarityDistribution = {
    excellent: successfulResults.filter(
      (r) => r.similarityResult.combined_similarity >= 0.9
    ).length,
    good: successfulResults.filter(
      (r) =>
        r.similarityResult.combined_similarity >= 0.7 &&
        r.similarityResult.combined_similarity < 0.9
    ).length,
    fair: successfulResults.filter(
      (r) =>
        r.similarityResult.combined_similarity >= 0.5 &&
        r.similarityResult.combined_similarity < 0.7
    ).length,
    poor: successfulResults.filter(
      (r) => r.similarityResult.combined_similarity < 0.5
    ).length,
  };

  // 生成最终报告
  const finalReport = {
    timestamp: new Date().toISOString(),
    workspace: workspaceName,
    type: "fsm-similarity-batch-evaluation",
    stats: {
      ...stats,
      avgSimilarity,
      similarityDistribution,
      totalTime: Date.now() - stats.startTime,
    },
    results,
    summary: {
      topSimilar: successfulResults
        .sort(
          (a, b) =>
            b.similarityResult.combined_similarity -
            a.similarityResult.combined_similarity
        )
        .slice(0, 5)
        .map((r) => ({
          fsmFileName: r.fsmFileName,
          concept: r.concept,
          similarity: r.summary.score,
          interpretation: r.summary.interpretation,
        })),
      bottomSimilar: successfulResults
        .sort(
          (a, b) =>
            a.similarityResult.combined_similarity -
            b.similarityResult.combined_similarity
        )
        .slice(0, 5)
        .map((r) => ({
          fsmFileName: r.fsmFileName,
          concept: r.concept,
          similarity: r.summary.score,
          interpretation: r.summary.interpretation,
        })),
    },
  };

  // 保存结果到文件
  await fs.writeFile(outputFile, JSON.stringify(finalReport, null, 2));

  // 输出最终统计
  const totalTime = ((Date.now() - stats.startTime) / 1000 / 60).toFixed(2);

  console.log(`
╔════════════════════════════════════════════════════════════════════════╗
║  批量相似度评估完成 - Batch Similarity Evaluation Completed            ║
╚════════════════════════════════════════════════════════════════════════╝

📊 执行统计:
  • 总文件数: ${stats.total}
  • 成功匹配: ${stats.matched} (${((stats.matched / stats.total) * 100).toFixed(
    1
  )}%)
  • 评估成功: ${stats.success} ✅
  • 评估失败: ${stats.failed} ❌
  • 未找到理想FSM: ${stats.unmatched} ⚠️
  • 总耗时: ${totalTime} 分钟

🎯 相似度分析:
  • 平均相似度: ${(avgSimilarity * 100).toFixed(1)}%
  • 优秀 (≥90%): ${similarityDistribution.excellent} 个
  • 良好 (70-89%): ${similarityDistribution.good} 个  
  • 一般 (50-69%): ${similarityDistribution.fair} 个
  • 较差 (<50%): ${similarityDistribution.poor} 个

📁 结果已保存到: ${outputFile}

🏆 相似度最高的5个:
${finalReport.summary.topSimilar
  .map((r) => `  • ${r.fsmFileName} (${r.concept}): ${r.similarity}%`)
  .join("\n")}

⚠️  相似度最低的5个:
${finalReport.summary.bottomSimilar
  .map((r) => `  • ${r.fsmFileName} (${r.concept}): ${r.similarity}%`)
  .join("\n")}
`);

  return finalReport;
}

// 命令行参数处理
function parseArgs() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
用法: node batch-similarity-eval.mjs <workspace-name>

参数:
  <workspace-name>    工作空间文件夹名称 (在workspace目录下)

示例:
  node batch-similarity-eval.mjs batch-fsm-similarity
  node batch-similarity-eval.mjs "batch-2025-11-25T23-45-53 copy"
    `);
    process.exit(0);
  }

  return args[0];
}

// 如果直接运行此文件
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const workspaceName = parseArgs();

  runBatchSimilarityEval(workspaceName)
    .then((result) => {
      console.log("🎉 批量FSM相似度评估完成！");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 批量FSM相似度评估失败:", error.message);
      process.exit(1);
    });
}

export default runBatchSimilarityEval;
