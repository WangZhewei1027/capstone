# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - heading "Kruskal's Algorithm Visualization" [level=1] [ref=e2]
  - generic [ref=e3]:
    - generic "Graph visualization" [ref=e4]
    - region [ref=e5]:
      - strong [ref=e6]: "Algorithm Info:"
      - paragraph [ref=e7]: Kruskal's algorithm finds a Minimum Spanning Tree (MST) of a weighted, connected graph by selecting edges in increasing order of weight while avoiding cycles.
      - paragraph [ref=e8]:
        - strong [ref=e9]: "Step explanation:"
      - list [ref=e10]:
        - listitem [ref=e11]: Sort all edges by weight (lowest to highest).
        - listitem [ref=e12]: Initialize a forest where each vertex is its own set.
        - listitem [ref=e13]: Iterate edges in sorted order and add an edge if it connects two distinct sets.
        - listitem [ref=e14]: Union the sets connected by that edge.
        - listitem [ref=e15]: Stop when all vertices are connected (MST formed).
      - paragraph [ref=e16]:
        - strong [ref=e17]: "Selected edges (MST):"
      - generic "List of edges selected in the minimum spanning tree" [ref=e18]: No edges selected yet.
  - generic "Algorithm controls" [ref=e19]:
    - generic [ref=e20]: "Select Graph:"
    - combobox "Select Graph:" [ref=e21] [cursor=pointer]:
      - option "Default Sample Graph" [selected]
      - option "Triangle Graph"
      - option "Square Graph"
      - option "Custom Graph (Add edges)"
    - button "Start" [ref=e22] [cursor=pointer]
    - button "Step" [disabled] [ref=e23]
    - button "Auto Run" [disabled] [ref=e24]
    - button "Reset" [disabled] [ref=e25]
```