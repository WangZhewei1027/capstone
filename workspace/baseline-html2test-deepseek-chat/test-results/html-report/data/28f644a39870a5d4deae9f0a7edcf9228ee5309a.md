# Page snapshot

```yaml
- generic [ref=e2]:
  - heading "Weighted Graph Visualization" [level=1] [ref=e3]
  - generic [ref=e4]:
    - heading "Graph Controls" [level=3] [ref=e5]
    - generic [ref=e6]:
      - textbox "Node 1" [ref=e7]: M
      - textbox "Node 2" [ref=e8]: "N"
      - spinbutton [ref=e9]: "7"
      - button "Add Edge" [active] [ref=e10] [cursor=pointer]
      - button "Add Node" [ref=e11] [cursor=pointer]
      - button "Clear Graph" [ref=e12] [cursor=pointer]
    - generic [ref=e13]:
      - button "Find Shortest Path" [ref=e14] [cursor=pointer]
      - textbox "Start Node" [ref=e15]: A
      - textbox "End Node" [ref=e16]: C
  - generic [ref=e19]:
    - heading "About Weighted Graphs" [level=3] [ref=e20]
    - paragraph [ref=e21]: A weighted graph is a graph where each edge has a numerical value (weight) associated with it. Weights can represent distances, costs, capacities, or other quantities.
    - paragraph [ref=e22]:
      - strong [ref=e23]: "Common applications:"
      - text: Network routing, GPS navigation, social network analysis, project scheduling, and optimization problems.
```