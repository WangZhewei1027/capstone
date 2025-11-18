# Page snapshot

```yaml
- main [ref=e2]:
  - generic [ref=e3]:
    - generic [ref=e4]: STK
    - generic [ref=e5]:
      - heading "Stack Playground — Explore push, pop, peek & algorithms" [level=1] [ref=e6]
      - paragraph [ref=e7]: Interactive, step-by-step visualization of the stack data structure with runnable examples and quizzes.
  - complementary "Controls" [ref=e8]:
    - generic [ref=e9]:
      - generic [ref=e10]:
        - generic [ref=e11]: Controls
        - generic [ref=e12]: Experiment with operations, animation speed, and storage style.
      - generic [ref=e13]: "Size: 0"
    - generic [ref=e14]:
      - generic [ref=e15]:
        - generic [ref=e16]: Stack Implementation
        - combobox "Select stack implementation" [ref=e17]:
          - option "Array-backed (contiguous)" [selected]
          - option "Linked-list nodes"
      - generic [ref=e18]:
        - generic [ref=e19]: Max capacity (0 = infinite)
        - spinbutton "Max capacity (0 = infinite)" [ref=e20]: "0"
      - generic [ref=e21]:
        - generic [ref=e22]: Value to push
        - generic [ref=e23]:
          - textbox "Value to push" [ref=e24]:
            - /placeholder: e.g. 42 or 'A'
          - button "Push" [ref=e25] [cursor=pointer]
```