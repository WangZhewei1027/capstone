# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - banner [ref=e2]: Graph Visualization (Directed / Undirected)
  - generic [ref=e3]:
    - generic [ref=e4]: "Graph Type:"
    - combobox "Graph Type:" [ref=e5]:
      - option "Directed"
      - option "Undirected" [selected]
    - button "Generate Random Graph" [ref=e6]
    - button "Clear Graph" [ref=e7]
  - generic [ref=e10]:
    - strong [ref=e11]: "Instructions:"
    - text: Drag nodes to reposition. Click on empty space to add a node. Click a node then another node to add an edge. Edges appear with arrows if directed graph.
```