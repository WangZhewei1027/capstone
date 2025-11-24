# Page snapshot

```yaml
- generic [ref=e1]:
  - heading "双端队列（Deque）交互式可视化演示" [level=1] [ref=e2]
  - generic "双端队列交互演示" [ref=e3]:
    - list "Deque内容展示" [ref=e4]:
      - listitem [ref=e5]: rear1
    - generic [ref=e6]:
      - textbox "输入要插入的元素" [active] [ref=e7]:
        - /placeholder: 输入元素
        - text: rear1
      - button "从前端添加元素" [ref=e8] [cursor=pointer]: 从前端添加
      - button "从后端添加元素" [ref=e9] [cursor=pointer]: 从后端添加
      - button "从前端移除元素" [disabled] [ref=e10]: 从前端移除
      - button "从后端移除元素" [disabled] [ref=e11]: 从后端移除
      - button "清空双端队列" [disabled] [ref=e12]: 清空队列
    - alert [ref=e13]
```