# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - heading "Stack 算法交互式可视化演示" [level=1] [ref=e2]
  - generic [ref=e4]:
    - textbox "入栈元素值" [ref=e5]:
      - /placeholder: 请填写要入栈的值
    - button "执行入栈操作" [disabled] [ref=e6]: Push
    - button "执行出栈操作" [disabled] [ref=e7]: Pop
    - button "查看栈顶元素" [disabled] [ref=e8]: Peek
    - button "清空栈" [disabled] [ref=e9]: Clear
  - generic [ref=e10]: 欢迎使用 Stack 算法可视化演示！请输入值点击Push开始。
  - generic [ref=e11]:
    - paragraph [ref=e12]: 操作说明：
    - list [ref=e13]:
      - listitem [ref=e14]:
        - text: 输入一个值，点击
        - strong [ref=e15]: Push
        - text: 可将元素入栈；
      - listitem [ref=e16]:
        - text: 点击
        - strong [ref=e17]: Pop
        - text: 可将栈顶元素出栈；
      - listitem [ref=e18]:
        - text: 点击
        - strong [ref=e19]: Peek
        - text: 查看当前栈顶元素不删除；
      - listitem [ref=e20]:
        - text: 点击
        - strong [ref=e21]: Clear
        - text: 可清空整个栈；
      - listitem [ref=e22]: 每个操作都有动画辅助直观理解栈操作过程。
```