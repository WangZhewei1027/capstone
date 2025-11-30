# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - heading "Prim's Algorithm - Minimum Spanning Tree Visualization" [level=1] [ref=e2]
  - generic [ref=e3]:
    - generic "Graph visualization" [ref=e5]
    - generic "Controls for Prim's algorithm" [ref=e6]:
      - generic [ref=e7]: "Number of Nodes (3 - 20):"
      - spinbutton "Number of Nodes (3 - 20):" [ref=e8]: "8"
      - generic [ref=e9]: "Edge Density (0.2 - 1.0):"
      - spinbutton "Edge Density (0.2 - 1.0):" [ref=e10]: "0.8"
      - generic [ref=e11]: "Max Edge Weight (1 - 20):"
      - spinbutton "Max Edge Weight (1 - 20):" [ref=e12]: "15"
      - button "Generate Random Graph" [ref=e13] [cursor=pointer]
      - button "Start Prim's Algorithm" [disabled] [ref=e14] [cursor=pointer]
      - button "Step" [disabled] [ref=e15] [cursor=pointer]
      - button "Reset" [disabled] [ref=e16] [cursor=pointer]
      - generic [ref=e17]: "Status: Waiting to generate graph."
  - contentinfo [ref=e19]: Visualization of Prim's algorithm to find Minimum Spanning Tree on a weighted undirected graph.
```