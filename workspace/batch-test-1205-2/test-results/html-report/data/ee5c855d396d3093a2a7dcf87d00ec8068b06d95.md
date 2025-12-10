# Page snapshot

```yaml
- generic [ref=e1]:
  - heading "Knapsack Problem Solver" [level=1] [ref=e2]
  - text: "Weights (comma-separated):"
  - textbox "Weights (comma-separated):" [ref=e3]:
    - /placeholder: e.g. 2,3,4,5
    - text: 2,3,4,5
  - text: "Values (comma-separated):"
  - textbox "Values (comma-separated):" [active] [ref=e4]:
    - /placeholder: e.g. 3,4,5,6
    - text: 3,4,5,6
  - text: "Capacity:"
  - spinbutton "Capacity:" [ref=e5]
  - button "Solve" [ref=e6]
  - heading "Result" [level=2] [ref=e7]
```