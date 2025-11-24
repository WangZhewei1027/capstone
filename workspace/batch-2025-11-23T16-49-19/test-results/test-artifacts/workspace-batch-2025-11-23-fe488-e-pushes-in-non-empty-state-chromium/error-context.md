# Page snapshot

```yaml
- generic [ref=e1]:
  - heading "Stack (LIFO) Demonstration" [level=1] [ref=e2]
  - generic [ref=e3]: "Stack Contents:"
  - list "Stack container" [ref=e4]:
    - generic [ref=e5]: (Stack is empty)
  - generic [ref=e6]: Top of Stack ↑ (Last pushed element appears at top)
  - generic [ref=e7]:
    - textbox "Element to push" [active] [ref=e8]:
      - /placeholder: Enter element to push
    - button "Push" [ref=e9] [cursor=pointer]
    - button "Pop" [ref=e10] [cursor=pointer]
    - button "Peek (Top Element)" [ref=e11] [cursor=pointer]
    - button "Clear Stack" [ref=e12] [cursor=pointer]
  - alert [ref=e13]
```