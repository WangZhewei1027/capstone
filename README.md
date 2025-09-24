# 使用方法

用的node v20

npm install安装所有包

node add.mjs 就可以调接口并记录

node analyze.mjs可以分析实验结果（通过tag筛选数据）

不要手动保存html！VS Code的自动格式化可能搞坏一些东西

uuid是唯一的，应该可以做到我们通过git协作

## 9.24 log

### 昨日观察：

Generate a single HTML file with JavaScript demonstrating the user given concept. It should be highly interactive and utilize multiple web components to show the concept step by step. Only respond in a single HTML file.

不如

Generate a single HTML file with JavaScript demonstrating the user given concept. Only respond in a single HTML file.

额外的prompt反而使得表现变差？

### 今日实验方案：

利用控制变量法，保持system prompt为：

Generate a single HTML file with JavaScript demonstrating the user-given concept. Only respond in a single HTML file.

***测试模型：***

gpt-5-mini
o1-mini （过程中发现不支持system prompt，暂时放弃）
o3-mini-high

deepseek-r1

gemini-2.5-pro

claude-sonnet-4-20250514

***测试concept：***

Bubble Sort

Linked List

K-means clustering

三大领域的concept

**实验结果**

每个组合生成一条，至少应有5*3=15条实验记录；实际多于15条

#### 实验结果：

筛选标签: "9/24"
匹配到记录数: 18，其中有评分的记录数: 18

== 按 model 统计 ==
model                     count  mean   min  max  stdev
------------------------  -----  -----  ---  ---  -----
claude-sonnet-4-20250514  3      4.333  4    5    0.471
deepseek-r1               3      3.000  2    4    0.816
gemini-2.5-pro            4      3.250  2    5    1.090
gpt-5-mini                4      4.250  3    5    0.829
o3-mini-high              4      3.000  3    3    0.000

== 按 question 统计 ==
question            count  mean   min  max  stdev
------------------  -----  -----  ---  ---  -----
Bubble Sort         6      3.667  3    5    0.745
K-means clustering  7      3.143  2    4    0.639
Linked List         5      4.000  2    5    1.265

已导出: /Users/wangzhewei/Working/capstone/stats_by_model.csv
已导出: /Users/wangzhewei/Working/capstone/stats_by_question.csv

#### 观察以及想法：

- 可以写一个预处理函数，只匹配`<html></html>`标签对，过滤掉一些奇怪的东西
- 复杂概念生成失败率高：K-means clustering 至少失败了两次（直接504错误）
- 对于gpt，o3表现没有gpt5好。o3视觉上非常粗糙。可能是o3注重推理而不是视觉上的工程化表现？
- Bubble Sort和Linked List有几个表现非常亮眼，K-means clustering不管是主观上还是客观上都差一截
- Linked List表现不稳定。stdev值确实非常高。

#### 评分标准方面的思考：

现在还是过于主观。一下是细化的想法：

UI方面：
- 美观（是否有配色，还是只用的html基础元素）
- 静态布局（在静态情况下，ui排布是否合理。比如按钮之- 间的间距）
- 动态布局
  - responsive （是否能适应常见窗口大小？至少两种）
  - 当数据变多时，会不会发生遮挡

功能性方面：
- 是否有足够的帮助学习的交互按钮
- 是否有reset按钮
- 概念本身的展示逻辑是否正确

