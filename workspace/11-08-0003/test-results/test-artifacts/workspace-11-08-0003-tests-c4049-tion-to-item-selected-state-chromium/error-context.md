# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - heading "Interactive Knapsack Problem Solver" [level=1] [ref=e2]
  - generic [ref=e3]:
    - generic [ref=e4] [cursor=pointer]: "Item 1 (Weight: 10, Value: 60)"
    - generic [ref=e5] [cursor=pointer]: "Item 2 (Weight: 20, Value: 100)"
    - generic [ref=e6] [cursor=pointer]: "Item 3 (Weight: 30, Value: 120)"
  - generic [ref=e7]:
    - strong [ref=e8]: "Knapsack:"
    - paragraph [ref=e9]: "Total Weight: 0"
    - paragraph [ref=e10]: "Total Value: 0"
  - generic [ref=e11]:
    - generic [ref=e12]: "Max Weight: 50"
    - 'slider "Max Weight: 50" [ref=e13]': "50"
  - button "Reset" [ref=e14]
```