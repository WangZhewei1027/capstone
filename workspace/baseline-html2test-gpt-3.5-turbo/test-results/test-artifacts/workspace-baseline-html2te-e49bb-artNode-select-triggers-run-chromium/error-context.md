# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - heading "Dijkstra's Algorithm" [level=2] [ref=e3]
    - generic [ref=e4]: "Select Start Node:"
    - combobox "Select Start Node:" [ref=e5]:
      - option "A" [selected]
      - option "B"
      - option "C"
      - option "D"
      - option "E"
      - option "F"
    - button "Run Algorithm" [ref=e6]
    - button "Reset" [ref=e7]
    - heading "Distances from Start Node" [level=3] [ref=e8]
    - table "Distances table" [ref=e9]:
      - rowgroup [ref=e10]:
        - row "Node Distance Previous" [ref=e11]:
          - cell "Node" [ref=e12]
          - cell "Distance" [ref=e13]
          - cell "Previous" [ref=e14]
      - rowgroup
    - heading "Algorithm Steps" [level=3] [ref=e15]
    - generic [ref=e17]:
      - text: Click nodes on the graph to set edges (drag from one node to another). You can drag nodes to reposition.
      - text: Edges show weights. Running starts from selected node.
  - generic "Graph visualization" [ref=e18]
```