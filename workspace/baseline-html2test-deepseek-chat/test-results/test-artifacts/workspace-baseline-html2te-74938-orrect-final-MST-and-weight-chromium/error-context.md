# Page snapshot

```yaml
- generic [ref=e1]:
  - heading "Kruskal's Algorithm Visualization" [level=1] [ref=e2]
  - generic [ref=e3]:
    - heading "Graph Visualization" [level=3] [ref=e5]
    - generic [ref=e7]:
      - heading "Algorithm Controls" [level=3] [ref=e8]
      - generic [ref=e9]:
        - button "Reset Graph" [ref=e10] [cursor=pointer]
        - button "Next Step" [active] [ref=e11] [cursor=pointer]
        - button "Run All Steps" [ref=e12] [cursor=pointer]
      - generic [ref=e13]:
        - heading "Current Step:" [level=4] [ref=e14]
        - generic [ref=e15]:
          - text: "Considering edge 2-3 (weight: 4)"
          - text: ✓ Added to MST (no cycle created)
          - text: "Union-Find: Parent array: [0,1,2,2,4]"
      - generic [ref=e16]:
        - heading "Edges (sorted by weight):" [level=4] [ref=e17]
        - list [ref=e18]:
          - listitem [ref=e19]: "Edge 2-3: weight 4 ✓ (In MST)"
          - listitem [ref=e20]: "Edge 0-3: weight 5"
          - listitem [ref=e21]: "Edge 0-2: weight 6"
          - listitem [ref=e22]: "Edge 3-4: weight 7"
          - listitem [ref=e23]: "Edge 1-4: weight 8"
          - listitem [ref=e24]: "Edge 0-1: weight 10"
          - listitem [ref=e25]: "Edge 2-4: weight 12"
          - listitem [ref=e26]: "Edge 1-2: weight 15"
      - 'heading "Minimum Spanning Tree Weight: 4" [level=4] [ref=e28]'
```