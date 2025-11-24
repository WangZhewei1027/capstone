# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - heading "双端队列（Deque）交互式可视化演示" [level=1] [ref=e2]
  - generic "双端队列交互演示" [ref=e3]:
    - list "Deque内容展示" [ref=e4]
    - generic [ref=e5]:
      - textbox "输入要插入的元素" [ref=e6]:
        - /placeholder: 输入元素
      - button "从前端添加元素" [ref=e7] [cursor=pointer]: 从前端添加
      - button "从后端添加元素" [ref=e8] [cursor=pointer]: 从后端添加
      - button "从前端移除元素" [disabled] [ref=e9]: 从前端移除
      - button "从后端移除元素" [disabled] [ref=e10]: 从后端移除
      - button "清空双端队列" [disabled] [ref=e11]: 清空队列
    - alert [ref=e12]: 请输入元素，点击按钮操作双端队列。最大容量20。
```