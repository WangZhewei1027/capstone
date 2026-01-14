# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - heading "Graph Visualization" [level=1] [ref=e2]
  - generic [ref=e3]:
    - text: "Select Graph Type:"
    - combobox "Select Graph Type:" [ref=e4]:
      - option "Undirected Graph" [selected]
      - option "Directed Graph"
  - generic [ref=e5]:
    - generic [ref=e6]:
      - heading "Graph A" [level=3] [ref=e7]
      - textbox "Add Vertex (e.g. A)" [ref=e8]
      - button "Add Vertex" [ref=e9]
    - generic [ref=e10]:
      - heading "Graph B" [level=3] [ref=e11]
      - textbox "Add Vertex (e.g. B)" [ref=e12]
      - button "Add Vertex" [ref=e13]
  - generic [ref=e14]:
    - text: "Edge From:"
    - textbox "Edge From:" [ref=e15]:
      - /placeholder: From Vertex
    - text: "To:"
    - textbox "To:" [ref=e16]:
      - /placeholder: To Vertex
    - button "Add Edge" [ref=e17]
```