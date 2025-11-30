# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - heading "Breadth-First Search (BFS) Visualization" [level=1] [ref=e2]
  - generic [ref=e3]:
    - text: "Select Start Node:"
    - combobox "Select Start Node:" [ref=e4]
    - button "Start BFS" [ref=e5] [cursor=pointer]
  - img
  - generic [ref=e6]: "BFS Visit Order:"
  - generic [ref=e7]:
    - strong [ref=e8]: "How to use:"
    - text: Click "Start BFS" to see the BFS traversal starting from the selected node. Nodes currently being visited are colored orange, visited nodes are green. The BFS order updates as the algorithm progresses.
```