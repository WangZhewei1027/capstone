# Page snapshot

```yaml
- generic [ref=e1]:
  - heading "Unlocking the Knapsack Problem" [level=1] [ref=e2]
  - paragraph [ref=e3]: Explore the challenges of the Knapsack Problem by selecting items and finding the best combination.
  - generic [ref=e4]:
    - generic [ref=e5] [cursor=pointer]:
      - text: "Item 1: (Weight: 4, Value: 10)"
      - checkbox [ref=e6]
    - generic [ref=e7] [cursor=pointer]:
      - text: "Item 2: (Weight: 2, Value: 4)"
      - checkbox [ref=e8]
    - generic [ref=e9] [cursor=pointer]:
      - text: "Item 3: (Weight: 5, Value: 7)"
      - checkbox [ref=e10]
    - generic [ref=e11] [cursor=pointer]:
      - text: "Item 4: (Weight: 1, Value: 2)"
      - checkbox [ref=e12]
  - generic [ref=e13]:
    - spinbutton [ref=e14]: "10"
    - button "Calculate" [active] [ref=e15]
  - generic [ref=e16]:
    - paragraph [ref=e17]:
      - strong [ref=e18]: "Optimal Items:"
      - text: None
    - paragraph [ref=e19]:
      - strong [ref=e20]: "Total Value:"
      - text: "0"
    - paragraph [ref=e21]:
      - strong [ref=e22]: "Total Weight:"
      - text: "0"
```