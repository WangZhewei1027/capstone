# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - heading "0/1 Knapsack Problem Solver" [level=1] [ref=e2]
  - paragraph [ref=e3]:
    - text: "Enter items as one per line in the format:"
    - code [ref=e4]: value weight
    - text: "Example:"
    - code [ref=e5]:
      - text: 60 10
      - text: 100 20
      - text: 120 30
  - generic [ref=e6]: "Items (value weight):"
  - textbox "List of items with value and weight" [ref=e7]: 60 10 100 20 120 30
  - generic [ref=e8]: "Knapsack Capacity (weight limit):"
  - spinbutton "Knapsack capacity" [ref=e9]: "50"
  - button "Solve Knapsack" [ref=e10] [cursor=pointer]
  - generic [ref=e12]:
    - text: Demonstration of 0/1 Knapsack Problem with dynamic programming.
    - text: "Format: one item per line -"
    - code [ref=e13]: value weight
    - text: . Capacity is a positive integer.
```