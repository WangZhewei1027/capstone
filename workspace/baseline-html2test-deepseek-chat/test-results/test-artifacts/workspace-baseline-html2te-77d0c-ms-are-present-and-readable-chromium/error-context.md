# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - text: "# Prim's Algorithm Visualization I'll create an interactive visualization of Prim's Algorithm for finding Minimum Spanning Trees (MST). This visualization will let users build their own graphs and watch the algorithm in action. ```html"
  - heading "Prim's Algorithm Visualization" [level=1] [ref=e2]
  - paragraph [ref=e3]: Prim's Algorithm finds a Minimum Spanning Tree (MST) for a weighted undirected graph.
  - generic [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e6]:
        - button "Add Node" [ref=e7] [cursor=pointer]
        - button "Run Prim's Algorithm" [ref=e8] [cursor=pointer]
        - button "Next Step" [ref=e9] [cursor=pointer]
        - button "Reset" [ref=e10] [cursor=pointer]
        - button "Generate Random Graph" [ref=e11] [cursor=pointer]
        - spinbutton [ref=e12]: "5"
      - generic [ref=e14]: Click on the canvas to add nodes. Click and drag between nodes to add edges.
    - generic [ref=e17]:
      - heading "Algorithm Steps" [level=3] [ref=e18]
      - paragraph [ref=e20]: Click "Run Prim's Algorithm" to start the visualization.
      - heading "Algorithm Log" [level=3] [ref=e21]
      - generic [ref=e23]:
        - generic [ref=e26]: Visited Node
        - generic [ref=e29]: Unvisited Node
        - generic [ref=e32]: MST Edge
        - generic [ref=e35]: Candidate Edge
```