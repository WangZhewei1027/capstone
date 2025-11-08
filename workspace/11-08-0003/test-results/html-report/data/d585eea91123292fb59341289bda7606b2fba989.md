# Page snapshot

```yaml
- generic [ref=e1]:
  - 'heading "Understanding Deque: A Double-Ended Queue" [level=1] [ref=e2]'
  - generic [ref=e3]:
    - spinbutton [ref=e4]
    - generic [ref=e5]:
      - button "Add to Front" [ref=e6] [cursor=pointer]
      - button "Add to Back" [active] [ref=e7] [cursor=pointer]
    - generic [ref=e8]:
      - button "Remove from Front" [ref=e9] [cursor=pointer]
      - button "Remove from Back" [ref=e10] [cursor=pointer]
    - paragraph [ref=e11]: A Deque allows insertion and removal of elements from both the front and back. It is useful in scenarios like history management, undo mechanisms, etc.
```