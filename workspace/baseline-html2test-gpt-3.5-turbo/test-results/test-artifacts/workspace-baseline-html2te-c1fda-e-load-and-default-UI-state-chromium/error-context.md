# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - banner [ref=e2]:
    - heading "Kruskal's Algorithm Visualization" [level=1] [ref=e3]
  - generic [ref=e6]:
    - heading "Graph & Kruskal's Algorithm" [level=2] [ref=e7]
    - paragraph [ref=e8]:
      - text: Click on nodes to create edges.
      - text: After adding edges, click
      - strong [ref=e9]: Run Kruskal
      - text: to find the MST.
      - text: Step through the algorithm with
      - strong [ref=e10]: Next Step
      - text: .
    - button "Add Node" [ref=e11] [cursor=pointer]
    - button "Clear Graph" [ref=e12] [cursor=pointer]
    - separator [ref=e13]
    - generic [ref=e14]:
      - strong [ref=e15]: "Selected edge for creation:"
      - text: None
    - separator [ref=e16]
    - button "Run Kruskal's Algorithm" [disabled] [ref=e17] [cursor=pointer]
    - button "Next Step" [disabled] [ref=e18] [cursor=pointer]
    - heading "Edges (weight)" [level=3] [ref=e19]
    - heading "Algorithm Log" [level=3] [ref=e21]
    - generic [ref=e23]:
      - heading "How it works:" [level=3] [ref=e24]
      - paragraph [ref=e25]:
        - strong [ref=e26]: Kruskal’s algorithm
        - text: finds the Minimum Spanning Tree (MST) of a connected, weighted graph. It works by sorting all edges by weight and then adding edges one-by-one, skipping those which form cycles, until all nodes are connected.
```