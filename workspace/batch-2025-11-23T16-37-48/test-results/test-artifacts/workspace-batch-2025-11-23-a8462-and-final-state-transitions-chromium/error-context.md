# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - heading "队列 (Queue) 交互式可视化演示" [level=1] [ref=e2]
  - list "队列可视化区域" [ref=e3]
  - region "队列操作控制面板" [ref=e5]:
    - spinbutton "输入要入队的数字" [ref=e6]
    - button "入队 (Enqueue)" [ref=e7] [cursor=pointer]
    - button "出队 (Dequeue)" [disabled] [ref=e8]
    - button "清空队列 (Clear)" [disabled] [ref=e9]
  - generic [ref=e10]:
    - paragraph [ref=e11]: 将输入的数字添加到队列的尾部。
    - paragraph [ref=e12]: 移除队列头部的元素。
    - paragraph [ref=e13]: 清空整个队列。
```