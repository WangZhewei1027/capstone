用的node v20

npm install安装所有包

node add.mjs 就可以调接口并记录

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

每个组合生成一条，应有5*3=15条实验记录

#### 实验效果总结：



#### 想法：

可以写一个预处理函数，只匹配`<html></html>`标签对，过滤掉一些奇怪的东西

#### 评分标准方面的思考：

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

