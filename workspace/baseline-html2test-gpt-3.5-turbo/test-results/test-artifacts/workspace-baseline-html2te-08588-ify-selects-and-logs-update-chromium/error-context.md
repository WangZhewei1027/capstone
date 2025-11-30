# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - heading "Dijkstra's Algorithm Visualization" [level=1] [ref=e2]
  - generic [ref=e6]:
    - generic [ref=e7]:
      - paragraph [ref=e8]: "Instructions:"
      - list [ref=e9]:
        - listitem [ref=e10]: Click on the canvas to create nodes.
        - listitem [ref=e11]: Click and drag from one node to another to add a directed edge (weight prompted).
        - listitem [ref=e12]: Select start and end nodes below.
        - listitem [ref=e13]: Click Run Dijkstra to find shortest path.
        - listitem [ref=e14]: Clear or reset as needed.
    - generic [ref=e15]: "Start Node:"
    - combobox "Start Node:" [disabled] [ref=e16]
    - generic [ref=e17]: "End Node:"
    - combobox "End Node:" [disabled] [ref=e18]
    - button "Run Dijkstra" [disabled] [ref=e19]
    - button "Step" [disabled] [ref=e20]
    - button "Reset" [disabled] [ref=e21]
    - button "Clear Graph" [ref=e22] [cursor=pointer]
    - generic [ref=e23]: "Log/Steps:"
```