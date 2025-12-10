# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - text: "```html"
  - heading "Bellman-Ford Algorithm Visualization" [level=1] [ref=e2]
  - generic [ref=e3]:
    - button "Next Step" [ref=e4] [cursor=pointer]
    - button "Run Algorithm" [ref=e5] [cursor=pointer]
    - button "Reset" [ref=e6] [cursor=pointer]
    - button "Generate Random Graph" [ref=e7] [cursor=pointer]
    - combobox [ref=e8]:
      - option "Simple Graph" [selected]
      - option "Graph with Negative Edge"
      - option "Graph with Negative Cycle"
  - generic [ref=e9]:
    - heading "Graph Visualization" [level=2] [ref=e11]
    - generic [ref=e13]:
      - heading "Algorithm Execution" [level=2] [ref=e14]
      - generic [ref=e15]: Click "Next Step" to start the algorithm execution.
      - heading "Distance Table" [level=3] [ref=e16]
      - table [ref=e17]:
        - rowgroup [ref=e18]:
          - row "Vertex Distance Previous" [ref=e19]:
            - cell "Vertex" [ref=e20]
            - cell "Distance" [ref=e21]
            - cell "Previous" [ref=e22]
        - rowgroup
      - heading "Algorithm Steps" [level=3] [ref=e23]
```