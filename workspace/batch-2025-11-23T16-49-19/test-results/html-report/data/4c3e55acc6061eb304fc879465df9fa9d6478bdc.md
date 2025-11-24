# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - heading "Queue Demonstration" [level=1] [ref=e2]
  - list "Queue contents" [ref=e3]:
    - generic [ref=e4]: (Queue is empty)
  - generic [ref=e5]:
    - textbox "Value to add to queue" [ref=e6]:
      - /placeholder: Enter value to enqueue
    - button "Enqueue" [ref=e7] [cursor=pointer]
    - button "Dequeue" [ref=e8] [cursor=pointer]
    - button "Peek" [ref=e9] [cursor=pointer]
    - button "Clear Queue" [ref=e10] [cursor=pointer]
  - generic [ref=e11]:
    - generic [ref=e12]: "Operation Log:"
    - generic [ref=e13]: "[12:52:33 AM] Queue demo initialized."
```