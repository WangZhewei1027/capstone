# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]: Understanding the Knapsack Problem
  - generic [ref=e3]:
    - generic [ref=e5]:
      - 'checkbox "Item A - Value: 60, Weight: 10" [ref=e6]'
      - text: "Item A - Value: 60, Weight: 10"
    - generic [ref=e8]:
      - 'checkbox "Item B - Value: 100, Weight: 20" [ref=e9]'
      - text: "Item B - Value: 100, Weight: 20"
    - generic [ref=e11]:
      - 'checkbox "Item C - Value: 120, Weight: 30" [ref=e12]'
      - text: "Item C - Value: 120, Weight: 30"
  - generic [ref=e13]:
    - text: "Max Capacity:"
    - spinbutton "Max Capacity:" [ref=e14]: "50"
    - button "Update Capacity" [ref=e15] [cursor=pointer]
  - button "Calculate" [ref=e17] [cursor=pointer]
```