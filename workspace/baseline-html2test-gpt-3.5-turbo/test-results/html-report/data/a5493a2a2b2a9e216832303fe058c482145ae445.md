# Page snapshot

```yaml
- generic [ref=e2]:
  - heading "Priority Queue Demo" [level=1] [ref=e3]
  - paragraph [ref=e4]: Insert elements with priority and dequeue highest priority first (lowest priority number = highest priority).
  - generic [ref=e5]: "Item Value:"
  - textbox "Item Value:" [active] [ref=e6]:
    - /placeholder: Enter value (string)
    - text: task-a
  - generic [ref=e7]: "Priority (integer):"
  - spinbutton "Priority (integer):" [ref=e8]: "3"
  - button "Add to Priority Queue" [ref=e9] [cursor=pointer]
  - button "Dequeue Highest Priority" [disabled] [ref=e10]
  - generic [ref=e11]:
    - heading "Current Queue (sorted by priority):" [level=3] [ref=e12]
    - table [ref=e13]:
      - rowgroup [ref=e14]:
        - row "Index Item Priority" [ref=e15]:
          - cell "Index" [ref=e16]
          - cell "Item" [ref=e17]
          - cell "Priority" [ref=e18]
      - rowgroup [ref=e19]:
        - row "Queue is empty" [ref=e20]:
          - cell "Queue is empty" [ref=e21]
```