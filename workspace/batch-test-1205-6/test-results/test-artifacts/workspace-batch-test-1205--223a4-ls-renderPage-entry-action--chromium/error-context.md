# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - heading "Priority Queue Demo" [level=1] [ref=e2]
  - text: "Element:"
  - textbox "Element:" [ref=e3]:
    - /placeholder: Enter element
  - text: "Priority:"
  - spinbutton "Priority:" [ref=e4]
  - button "Enqueue" [ref=e5]
  - button "Dequeue" [ref=e6]
  - generic [ref=e7]:
    - heading "Current Priority Queue" [level=2] [ref=e8]
    - list
```