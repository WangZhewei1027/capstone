# Page snapshot

```yaml
- generic [ref=e5]:
  - heading "Prim's Algorithm" [level=1] [ref=e6]
  - generic [ref=e7]: "Number of vertices (3 - 12):"
  - spinbutton "Number of vertices (3 - 12):" [ref=e8]: "6"
  - button "Generate Random Graph" [ref=e9] [cursor=pointer]
  - button "Start Prim's Algorithm" [disabled] [ref=e10]
  - button "Next Step" [disabled] [ref=e11]
  - button "Reset" [disabled] [ref=e12]
  - generic [ref=e13]:
    - strong [ref=e14]: "Algorithm Status:"
    - generic [ref=e15]: Click "Generate Random Graph" to begin.
  - generic [ref=e16]:
    - strong [ref=e17]: "Prim's Algorithm (Minimal Spanning Tree):"
    - paragraph [ref=e18]: Prim's algorithm builds a minimum spanning tree (MST) for a weighted undirected graph. It starts from any vertex and grows the spanning tree by repeatedly adding the smallest edge that connects a vertex inside the MST to a vertex outside it until all vertices are included.
    - paragraph [ref=e19]:
      - strong [ref=e20]: "Steps:"
    - list [ref=e21]:
      - listitem [ref=e22]: Initialize MST with one vertex (start vertex).
      - listitem [ref=e23]: Find the edge with the minimum weight that connects MST to a vertex not yet included.
      - listitem [ref=e24]: Add that edge and the vertex to MST.
      - listitem [ref=e25]: Repeat until all vertices are in MST.
    - paragraph
    - paragraph [ref=e26]: This visualization shows the graph with weighted edges, and step-by-step how Prim's algorithm selects edges.
    - paragraph [ref=e27]:
      - text: Created by ChatGPT —
      - link "Learn More" [ref=e28] [cursor=pointer]:
        - /url: https://en.wikipedia.org/wiki/Prim%27s_algorithm
```