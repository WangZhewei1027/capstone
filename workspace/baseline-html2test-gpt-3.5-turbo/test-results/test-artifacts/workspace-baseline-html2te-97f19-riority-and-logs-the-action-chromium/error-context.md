# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - heading "Priority Queue Demo" [level=1] [ref=e2]
  - generic [ref=e3]:
    - generic [ref=e4]: "Value (string):"
    - textbox "Value (string):" [ref=e5]:
      - /placeholder: Enter item value
    - generic [ref=e6]: "Priority (integer, lower = higher priority):"
    - spinbutton "Priority (integer, lower = higher priority):" [ref=e7]: "0"
    - button "Enqueue" [ref=e8] [cursor=pointer]
  - button "Dequeue" [ref=e9] [cursor=pointer]
  - heading "Queue contents (from highest to lowest priority):" [level=2] [ref=e10]
  - generic [ref=e11]: Queue is empty
  - heading "Action Log:" [level=2] [ref=e12]
```