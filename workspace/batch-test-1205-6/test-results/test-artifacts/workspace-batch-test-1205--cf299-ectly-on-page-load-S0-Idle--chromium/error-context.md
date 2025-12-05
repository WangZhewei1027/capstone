# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - heading "Knapsack Problem Solver" [level=1] [ref=e2]
  - text: "Enter weights (comma separated):"
  - textbox "Enter weights (comma separated):" [ref=e3]:
    - /placeholder: e.g. 1,2,3,2
  - text: "Enter values (comma separated):"
  - textbox "Enter values (comma separated):" [ref=e4]:
    - /placeholder: e.g. 6,10,12,7
  - text: "Enter capacity:"
  - spinbutton "Enter capacity:" [ref=e5]
  - button "Solve Knapsack" [ref=e6] [cursor=pointer]
```