这次实验的配置

const TEST_CONFIG = {
  workspace: "11-08-0003",
  concurrencyLimit: 50,
  defaultTopic: "bubble sort", // 默认主题
  enableFSM: true, // 启用 FSM 生成（Agent 2）
  enableTests: true, // 启用 Playwright 测con试生成（Agent 3）
  showProgress: false, // 是否显示详细进度
  generationsPerQuestion: 3, // 每个问题生成的次数（默认1次）

  // 每个 Agent 使用的模型配置
  models: {
    htmlAgent: "gpt-4o-mini", // Agent 1: HTML 生成
    fsmAgent: "gpt-4o-mini", // Agent 2: FSM 生成
    testAgent: "gpt-4o-mini", // Agent 3: 测试生成
  },
};


📊 分析 141 个测试得分...

📈 基本统计:
   总数: 141
   平均分: 17.91%
   中位数: 16.67%
   标准差: 11.51%
   最高分: 62.50%
   最低分: 0.00%

📊 分布特征:
   偏度: 1.103
   峰度: 2.683
   卡方统计量: 385.967
   正态性评分: 18.5%

📉 百分位数:
   25%: 12.5%
   50%: 16.7%
   75%: 25.0%
   90%: 28.6%

📋 分数段分布:
   0-10%      | ███████ 18 (12.77%)
   10-20%     | ████████████████████████████ 77 (54.61%)
   20-30%     | ████████████ 33 (23.40%)
   30-40%     | ███ 7 (4.96%)
   40-50%     | █ 2 (1.42%)
   50-60%     | █ 2 (1.42%)
   60-70%     | █ 2 (1.42%)

✅ 分析报告已生成: workspace/11-08-0003/score-analysis-report.html

🎯 正态性结论:
   ❌ 得分分布偏离正态分布较大


[
    "Array",
    "Linked List",
    "Stack",
    "Queue",
    "Deque",
    "Hash Table",
    "Hash Map",
    "Set",
    "Binary Tree",
    "Binary Search Tree (BST)",
    "Red-Black Tree",
    "Heap (Min/Max)",
    "Graph (Directed/Undirected)",
    "Weighted Graph",
    "Adjacency Matrix",
    "Adjacency List",
    "Union-Find (Disjoint Set)",
    "Priority Queue",
    "Bubble Sort",
    "Selection Sort",
    "Insertion Sort",
    "Merge Sort",
    "Quick Sort",
    "Heap Sort",
    "Counting Sort",
    "Radix Sort",
    "Linear Search",
    "Binary Search",
    "Depth-First Search (DFS)",
    "Breadth-First Search (BFS)",
    "Dijkstra’s Algorithm",
    "Bellman-Ford Algorithm",
    "Floyd-Warshall Algorithm",
    "Kruskal’s Algorithm",
    "Prim’s Algorithm",
    "Topological Sort",
    "Fibonacci Sequence",
    "Knapsack Problem",
    "Longest Common Subsequence",
    "Huffman Coding",
    "Recursion",
    "Divide and Conquer",
    "Sliding Window",
    "Two Pointers",
    "Linear Regression",
    "K-Nearest Neighbors (KNN)",
    "K-Means Clustering"
]
