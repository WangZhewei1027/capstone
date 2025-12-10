# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - heading "Bellman-Ford Algorithm Visualization" [level=1] [ref=e2]
  - paragraph [ref=e3]: Visualize shortest paths in a directed graph with weights.
  - heading "Input Graph" [level=2] [ref=e4]
  - text: "Enter edges (format: src dest weight, separated by commas):"
  - 'textbox "Enter edges (format: src dest weight, separated by commas):" [ref=e5]':
    - /placeholder: 0 1 4, 0 2 1, 1 2 2, 1 3 5, 2 3 8, 3 1 -4
  - text: "Enter source vertex:"
  - spinbutton "Enter source vertex:" [ref=e6]: "0"
  - button "Run Bellman-Ford" [ref=e7] [cursor=pointer]
```