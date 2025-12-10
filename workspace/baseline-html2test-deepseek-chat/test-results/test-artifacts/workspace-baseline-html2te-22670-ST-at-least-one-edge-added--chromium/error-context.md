# Page snapshot

```yaml
- generic [ref=e2]:
  - heading "Prim's Algorithm Visualization" [level=1] [ref=e3]
  - generic [ref=e4]:
    - button "Generate Random Graph" [ref=e5] [cursor=pointer]
    - button "Start Prim's Algorithm" [ref=e6] [cursor=pointer]
    - button "Next Step" [ref=e7] [cursor=pointer]
    - button "Reset" [ref=e8] [cursor=pointer]
    - generic [ref=e9]:
      - text: "Number of Nodes:"
      - spinbutton "Number of Nodes:" [ref=e10]: "6"
  - generic [ref=e14]:
    - heading "Algorithm Steps" [level=3] [ref=e15]
    - generic [ref=e16]: Algorithm reset. Click 'Start Prim's Algorithm' to begin.
    - heading "Minimum Spanning Tree" [level=3] [ref=e17]
    - generic [ref=e18]: "Total weight: 0"
    - heading "About Prim's Algorithm" [level=3] [ref=e19]
    - paragraph [ref=e20]: Prim's algorithm is a greedy algorithm that finds a minimum spanning tree for a weighted undirected graph.
    - paragraph [ref=e21]:
      - strong [ref=e22]: "Time Complexity:"
      - text: O(E log V) using binary heap
    - paragraph [ref=e23]:
      - strong [ref=e24]: "Steps:"
    - list [ref=e25]:
      - listitem [ref=e26]: Start with an arbitrary node
      - listitem [ref=e27]: Add the minimum weight edge connecting the tree to a new node
      - listitem [ref=e28]: Repeat until all nodes are included
```