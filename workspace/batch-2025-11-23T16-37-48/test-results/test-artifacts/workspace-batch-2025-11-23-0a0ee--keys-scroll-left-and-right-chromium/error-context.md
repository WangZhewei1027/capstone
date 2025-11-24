# Page snapshot

```yaml
- generic [ref=e1]:
  - banner [ref=e2]: 链表算法交互式可视化演示
  - generic [ref=e3]:
    - generic "链表操作控制" [ref=e6]:
      - generic "节点数据 (字符串)" [ref=e7]:
        - generic [ref=e8]: 节点值：
        - textbox "节点值：" [ref=e9]:
          - /placeholder: "例: 10"
      - generic "位置索引 (从 0 开始)" [ref=e10]:
        - generic [ref=e11]: 位置：
        - spinbutton "位置：" [ref=e12]
      - button "尾部添加" [ref=e13] [cursor=pointer]
      - button "头部添加" [ref=e14] [cursor=pointer]
      - button "指定位置插入" [ref=e15] [cursor=pointer]
      - button "尾部删除" [ref=e16] [cursor=pointer]
      - button "头部删除" [ref=e17] [cursor=pointer]
      - button "指定位置删除" [ref=e18] [cursor=pointer]
      - button "查找节点" [ref=e19] [cursor=pointer]
      - button "重置链表" [ref=e20] [cursor=pointer]
      - generic "动画速度调整" [ref=e21]:
        - generic [ref=e22]: 速度：
        - slider "动画速度" [ref=e23]: "1"
    - alert [ref=e24]: 动画速度设为 1.0x
    - generic "图例" [ref=e25]:
      - generic [ref=e26]: 节点
      - generic [ref=e28]: 当前遍历节点
      - generic [ref=e30]: 已遍历节点
```