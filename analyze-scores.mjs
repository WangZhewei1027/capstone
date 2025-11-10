#!/usr/bin/env node
import fs from "fs";
import path from "path";

/**
 * 分析测试得分分布并生成可视化HTML报告
 * 用法: node analyze-scores.mjs <workspace-path>
 * 示例: node analyze-scores.mjs workspace/11-08-0003
 */

// 计算平均值
function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// 计算标准差
function standardDeviation(arr) {
  const avg = mean(arr);
  const squareDiffs = arr.map((value) => Math.pow(value - avg, 2));
  const avgSquareDiff = mean(squareDiffs);
  return Math.sqrt(avgSquareDiff);
}

// 计算正态分布概率密度函数
function normalPDF(x, mean, stdDev) {
  const exponent = -Math.pow(x - mean, 2) / (2 * Math.pow(stdDev, 2));
  return (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
}

// 生成分数段统计
function generateScoreBins(scores, binSize = 0.1) {
  const bins = {};

  // 初始化所有分数段（0-1，步长0.1）
  for (let i = 0; i <= 1; i += binSize) {
    const binKey = i.toFixed(1);
    bins[binKey] = {
      range: `${(i * 100).toFixed(0)}-${((i + binSize) * 100).toFixed(0)}%`,
      count: 0,
      percentage: 0,
      scores: [],
    };
  }

  // 统计每个分数段的数量
  scores.forEach((score) => {
    const binIndex = Math.floor(score / binSize) * binSize;
    const binKey = Math.min(binIndex, 1.0).toFixed(1);

    if (bins[binKey]) {
      bins[binKey].count++;
      bins[binKey].scores.push(score);
    }
  });

  // 计算百分比
  const total = scores.length;
  Object.keys(bins).forEach((key) => {
    bins[key].percentage = ((bins[key].count / total) * 100).toFixed(2);
  });

  return bins;
}

// 卡方检验（简化版）
function chiSquareTest(observed, expected) {
  let chiSquare = 0;
  for (let i = 0; i < observed.length; i++) {
    if (expected[i] > 0) {
      chiSquare += Math.pow(observed[i] - expected[i], 2) / expected[i];
    }
  }
  return chiSquare;
}

// 生成HTML报告
function generateHTMLReport(stats, outputPath) {
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>测试得分分布分析</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            min-height: 100vh;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
        }
        
        h1 {
            color: white;
            text-align: center;
            margin-bottom: 30px;
            font-size: 2.5rem;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 15px;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
        }
        
        .stat-label {
            color: #666;
            font-size: 0.9rem;
            margin-bottom: 8px;
            font-weight: 500;
        }
        
        .stat-value {
            color: #333;
            font-size: 2rem;
            font-weight: bold;
        }
        
        .stat-value.large {
            font-size: 2.5rem;
            color: #667eea;
        }
        
        .chart-container {
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
            margin-bottom: 30px;
        }
        
        .chart-title {
            font-size: 1.5rem;
            color: #333;
            margin-bottom: 20px;
            font-weight: 600;
        }
        
        canvas {
            max-height: 400px;
        }
        
        .distribution-table {
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
            margin-bottom: 30px;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
        }
        
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e0e0e0;
        }
        
        th {
            background: #f5f5f5;
            font-weight: 600;
            color: #333;
        }
        
        tr:hover {
            background: #f9f9f9;
        }
        
        .progress-bar {
            height: 20px;
            background: #e0e0e0;
            border-radius: 10px;
            overflow: hidden;
            position: relative;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
            transition: width 0.3s ease;
        }
        
        .analysis-section {
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
            margin-bottom: 30px;
        }
        
        .analysis-title {
            font-size: 1.3rem;
            color: #333;
            margin-bottom: 15px;
            font-weight: 600;
        }
        
        .analysis-content {
            color: #666;
            line-height: 1.6;
        }
        
        .conclusion {
            background: #e8f5e9;
            border-left: 4px solid #4caf50;
            padding: 15px;
            margin-top: 15px;
            border-radius: 5px;
        }
        
        .conclusion.warning {
            background: #fff3e0;
            border-left-color: #ff9800;
        }
        
        .conclusion.error {
            background: #ffebee;
            border-left-color: #f44336;
        }
        
        .percentile-info {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-top: 20px;
        }
        
        .percentile-card {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 10px;
            text-align: center;
        }
        
        .percentile-label {
            font-size: 0.85rem;
            color: #666;
            margin-bottom: 5px;
        }
        
        .percentile-value {
            font-size: 1.5rem;
            font-weight: bold;
            color: #667eea;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 测试得分分布分析报告</h1>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">总测试数</div>
                <div class="stat-value large">${stats.total}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">平均分</div>
                <div class="stat-value">${(stats.mean * 100).toFixed(2)}%</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">中位数</div>
                <div class="stat-value">${(stats.median * 100).toFixed(
                  2
                )}%</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">标准差</div>
                <div class="stat-value">${(stats.stdDev * 100).toFixed(
                  2
                )}%</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">最高分</div>
                <div class="stat-value">${(stats.max * 100).toFixed(2)}%</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">最低分</div>
                <div class="stat-value">${(stats.min * 100).toFixed(2)}%</div>
            </div>
        </div>
        
        <div class="chart-container">
            <div class="chart-title">得分分布直方图（实际 vs 正态分布）</div>
            <canvas id="histogramChart"></canvas>
        </div>
        
        <div class="chart-container">
            <div class="chart-title">累积分布函数（CDF）</div>
            <canvas id="cdfChart"></canvas>
        </div>
        
        <div class="distribution-table">
            <div class="chart-title">分数段详细统计</div>
            <table>
                <thead>
                    <tr>
                        <th>分数段</th>
                        <th>数量</th>
                        <th>百分比</th>
                        <th>可视化</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(stats.bins)
                      .map(
                        ([key, bin]) => `
                    <tr>
                        <td><strong>${bin.range}</strong></td>
                        <td>${bin.count}</td>
                        <td>${bin.percentage}%</td>
                        <td>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${bin.percentage}%"></div>
                            </div>
                        </td>
                    </tr>
                    `
                      )
                      .join("")}
                </tbody>
            </table>
        </div>
        
        <div class="analysis-section">
            <div class="analysis-title">📈 分布特征分析</div>
            <div class="analysis-content">
                <p><strong>偏度 (Skewness):</strong> ${stats.skewness.toFixed(
                  3
                )}</p>
                <p style="margin-top: 10px;">
                    ${
                      Math.abs(stats.skewness) < 0.5
                        ? "✅ 接近对称分布（正态分布的特征之一）"
                        : stats.skewness > 0
                        ? "⚠️ 右偏分布（低分较多，高分较少）"
                        : "⚠️ 左偏分布（高分较多，低分较少）"
                    }
                </p>
                
                <p style="margin-top: 15px;"><strong>峰度 (Kurtosis):</strong> ${stats.kurtosis.toFixed(
                  3
                )}</p>
                <p style="margin-top: 10px;">
                    ${
                      Math.abs(stats.kurtosis) < 0.5
                        ? "✅ 接近正态分布的峰度"
                        : stats.kurtosis > 0
                        ? "⚠️ 尖峰分布（数据集中度高）"
                        : "⚠️ 平峰分布（数据分散度高）"
                    }
                </p>
                
                <p style="margin-top: 15px;"><strong>卡方检验统计量:</strong> ${stats.chiSquare.toFixed(
                  3
                )}</p>
                <p style="margin-top: 10px;">
                    ${
                      stats.chiSquare < 15.507
                        ? "✅ 通过正态分布检验（p > 0.05）"
                        : stats.chiSquare < 20.09
                        ? "⚠️ 边缘通过（p ≈ 0.05）"
                        : "❌ 未通过正态分布检验（p < 0.05）"
                    }
                </p>
                
                <div class="percentile-info">
                    <div class="percentile-card">
                        <div class="percentile-label">25th 百分位</div>
                        <div class="percentile-value">${(
                          stats.percentiles.p25 * 100
                        ).toFixed(1)}%</div>
                    </div>
                    <div class="percentile-card">
                        <div class="percentile-label">50th 百分位 (中位数)</div>
                        <div class="percentile-value">${(
                          stats.percentiles.p50 * 100
                        ).toFixed(1)}%</div>
                    </div>
                    <div class="percentile-card">
                        <div class="percentile-label">75th 百分位</div>
                        <div class="percentile-value">${(
                          stats.percentiles.p75 * 100
                        ).toFixed(1)}%</div>
                    </div>
                    <div class="percentile-card">
                        <div class="percentile-label">90th 百分位</div>
                        <div class="percentile-value">${(
                          stats.percentiles.p90 * 100
                        ).toFixed(1)}%</div>
                    </div>
                </div>
                
                <div class="conclusion ${
                  stats.normalityScore >= 0.8
                    ? ""
                    : stats.normalityScore >= 0.6
                    ? "warning"
                    : "error"
                }">
                    <strong>📊 正态性综合评分: ${(
                      stats.normalityScore * 100
                    ).toFixed(1)}%</strong>
                    <p style="margin-top: 10px;">
                        ${
                          stats.normalityScore >= 0.8
                            ? "✅ 得分分布基本符合正态分布，测试结果可靠。"
                            : stats.normalityScore >= 0.6
                            ? "⚠️ 得分分布部分符合正态分布，建议进一步优化测试用例。"
                            : "❌ 得分分布偏离正态分布较大，建议检查测试设计和实现质量。"
                        }
                    </p>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        // 直方图 - 实际分布 vs 正态分布
        const histogramCtx = document.getElementById('histogramChart').getContext('2d');
        new Chart(histogramCtx, {
            type: 'bar',
            data: {
                labels: ${JSON.stringify(
                  Object.values(stats.bins).map((b) => b.range)
                )},
                datasets: [{
                    label: '实际分布',
                    data: ${JSON.stringify(
                      Object.values(stats.bins).map((b) => b.count)
                    )},
                    backgroundColor: 'rgba(102, 126, 234, 0.6)',
                    borderColor: 'rgba(102, 126, 234, 1)',
                    borderWidth: 2
                }, {
                    label: '理论正态分布',
                    data: ${JSON.stringify(stats.expectedNormal)},
                    type: 'line',
                    borderColor: 'rgba(244, 67, 54, 0.8)',
                    backgroundColor: 'rgba(244, 67, 54, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '数量'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: '得分区间'
                        }
                    }
                }
            }
        });
        
        // CDF 图表
        const cdfCtx = document.getElementById('cdfChart').getContext('2d');
        new Chart(cdfCtx, {
            type: 'line',
            data: {
                labels: ${JSON.stringify(stats.cdfData.labels)},
                datasets: [{
                    label: '累积分布',
                    data: ${JSON.stringify(stats.cdfData.values)},
                    borderColor: 'rgba(102, 126, 234, 1)',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: '累积百分比 (%)'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: '得分'
                        }
                    }
                }
            }
        });
    </script>
</body>
</html>`;

  fs.writeFileSync(outputPath, html, "utf8");
}

function analyzeScores(workspacePath) {
  const dataPath = path.join(workspacePath, "data", "data.json");

  if (!fs.existsSync(dataPath)) {
    console.error(`❌ 数据文件不存在: ${dataPath}`);
    process.exit(1);
  }

  // 读取数据
  const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));

  // 提取所有有效的测试得分
  const scores = [];
  const dataArray = Array.isArray(data) ? data : Object.values(data);

  dataArray.forEach((item) => {
    if (item.testStats && typeof item.testStats.score === "number") {
      scores.push(item.testStats.score);
    }
  });

  if (scores.length === 0) {
    console.error("❌ 未找到有效的测试得分数据");
    process.exit(1);
  }

  console.log(`📊 分析 ${scores.length} 个测试得分...\n`);

  // 排序
  const sortedScores = [...scores].sort((a, b) => a - b);

  // 基本统计
  const avg = mean(scores);
  const stdDev = standardDeviation(scores);
  const median = sortedScores[Math.floor(sortedScores.length / 2)];
  const min = Math.min(...scores);
  const max = Math.max(...scores);

  // 百分位数
  const getPercentile = (arr, p) => {
    const index = Math.ceil((p / 100) * arr.length) - 1;
    return arr[Math.max(0, index)];
  };

  const percentiles = {
    p25: getPercentile(sortedScores, 25),
    p50: median,
    p75: getPercentile(sortedScores, 75),
    p90: getPercentile(sortedScores, 90),
  };

  // 计算偏度和峰度
  const n = scores.length;
  const m3 = scores.reduce((sum, x) => sum + Math.pow(x - avg, 3), 0) / n;
  const m4 = scores.reduce((sum, x) => sum + Math.pow(x - avg, 4), 0) / n;
  const skewness = m3 / Math.pow(stdDev, 3);
  const kurtosis = m4 / Math.pow(stdDev, 4) - 3;

  // 生成分数段统计
  const bins = generateScoreBins(scores, 0.1);

  // 计算期望的正态分布
  const expectedNormal = Object.keys(bins).map((key) => {
    const binStart = parseFloat(key);
    const binEnd = binStart + 0.1;
    const binMid = (binStart + binEnd) / 2;

    // 计算该分数段在正态分布下的期望频数
    const probability = normalPDF(binMid, avg, stdDev) * 0.1; // 区间宽度
    return probability * scores.length;
  });

  // 卡方检验
  const observed = Object.values(bins).map((b) => b.count);
  const chiSquare = chiSquareTest(observed, expectedNormal);

  // 生成CDF数据
  const cdfData = {
    labels: [],
    values: [],
  };

  for (let i = 0; i <= 100; i += 5) {
    const score = i / 100;
    const count = sortedScores.filter((s) => s <= score).length;
    const percentage = (count / scores.length) * 100;
    cdfData.labels.push(`${i}%`);
    cdfData.values.push(percentage);
  }

  // 计算正态性综合评分（0-1）
  const skewnessScore = Math.max(0, 1 - Math.abs(skewness) / 2);
  const kurtosisScore = Math.max(0, 1 - Math.abs(kurtosis) / 3);
  const chiSquareScore = Math.max(0, 1 - chiSquare / 30);
  const normalityScore = (skewnessScore + kurtosisScore + chiSquareScore) / 3;

  const stats = {
    total: scores.length,
    mean: avg,
    median,
    stdDev,
    min,
    max,
    percentiles,
    skewness,
    kurtosis,
    chiSquare,
    normalityScore,
    bins,
    expectedNormal,
    cdfData,
  };

  // 输出控制台摘要
  console.log("📈 基本统计:");
  console.log(`   总数: ${stats.total}`);
  console.log(`   平均分: ${(avg * 100).toFixed(2)}%`);
  console.log(`   中位数: ${(median * 100).toFixed(2)}%`);
  console.log(`   标准差: ${(stdDev * 100).toFixed(2)}%`);
  console.log(`   最高分: ${(max * 100).toFixed(2)}%`);
  console.log(`   最低分: ${(min * 100).toFixed(2)}%`);

  console.log("\n📊 分布特征:");
  console.log(`   偏度: ${skewness.toFixed(3)}`);
  console.log(`   峰度: ${kurtosis.toFixed(3)}`);
  console.log(`   卡方统计量: ${chiSquare.toFixed(3)}`);
  console.log(`   正态性评分: ${(normalityScore * 100).toFixed(1)}%`);

  console.log("\n📉 百分位数:");
  console.log(`   25%: ${(percentiles.p25 * 100).toFixed(1)}%`);
  console.log(`   50%: ${(percentiles.p50 * 100).toFixed(1)}%`);
  console.log(`   75%: ${(percentiles.p75 * 100).toFixed(1)}%`);
  console.log(`   90%: ${(percentiles.p90 * 100).toFixed(1)}%`);

  console.log("\n📋 分数段分布:");
  Object.entries(bins).forEach(([key, bin]) => {
    if (bin.count > 0) {
      const bar = "█".repeat(Math.ceil(parseFloat(bin.percentage) / 2));
      console.log(
        `   ${bin.range.padEnd(10)} | ${bar} ${bin.count} (${bin.percentage}%)`
      );
    }
  });

  // 生成HTML报告
  const reportPath = path.join(workspacePath, "score-analysis-report.html");
  generateHTMLReport(stats, reportPath);
  console.log(`\n✅ 分析报告已生成: ${reportPath}`);

  // 正态性结论
  console.log("\n🎯 正态性结论:");
  if (normalityScore >= 0.8) {
    console.log("   ✅ 得分分布基本符合正态分布");
  } else if (normalityScore >= 0.6) {
    console.log("   ⚠️  得分分布部分符合正态分布");
  } else {
    console.log("   ❌ 得分分布偏离正态分布较大");
  }
}

// 主程序
const workspacePath = process.argv[2];

if (!workspacePath) {
  console.error("用法: node analyze-scores.mjs <workspace-path>");
  console.error("示例: node analyze-scores.mjs workspace/11-08-0003");
  process.exit(1);
}

analyzeScores(workspacePath);
