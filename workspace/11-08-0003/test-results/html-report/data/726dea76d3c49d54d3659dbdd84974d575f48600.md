# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - heading "Graph Area" [level=2] [ref=e4]
    - generic [ref=e5] [cursor=pointer]: "0"
  - generic [ref=e6]:
    - heading "Control Panel" [level=2] [ref=e7]
    - text: "Select graph type:"
    - combobox "Select graph type:" [ref=e8]:
      - option "Undirected" [selected]
      - option "Directed"
    - button "Add Node" [active] [ref=e9] [cursor=pointer]
    - paragraph [ref=e10]: Add nodes to the graph and connect them by dragging between them.
```