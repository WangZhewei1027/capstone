# Page snapshot

```yaml
- generic [ref=e2]:
  - heading "Graph Area" [level=2] [ref=e4]
  - generic [ref=e5]:
    - heading "Control Panel" [level=2] [ref=e6]
    - text: "Select graph type:"
    - combobox "Select graph type:" [ref=e7]:
      - option "Undirected"
      - option "Directed" [selected]
    - button "Add Node" [active] [ref=e8] [cursor=pointer]
    - paragraph [ref=e9]: Add nodes to the graph and connect them by dragging between them.
```