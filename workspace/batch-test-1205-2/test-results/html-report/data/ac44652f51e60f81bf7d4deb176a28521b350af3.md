# Page snapshot

```yaml
- generic [ref=e1]:
  - heading "Knapsack Problem Solver" [level=1] [ref=e2]
  - text: "Weights (comma-separated):"
  - textbox "Weights (comma-separated):" [ref=e3]:
    - /placeholder: e.g. 2,3,4,5
    - text: 1,2,3
  - text: "Values (comma-separated):"
  - textbox "Values (comma-separated):" [ref=e4]:
    - /placeholder: e.g. 3,4,5,6
    - text: 10,20,30
  - text: "Capacity:"
  - spinbutton "Capacity:" [ref=e5]: "0"
  - button "Solve" [active] [ref=e6]
  - heading "Result" [level=2] [ref=e7]
  - generic [ref=e8]:
    - paragraph [ref=e9]:
      - text: "Maximum Value:"
      - strong [ref=e10]: "0"
    - paragraph [ref=e11]:
      - text: "Selected Items (0-indexed):"
      - strong
```