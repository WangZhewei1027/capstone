# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - banner [ref=e2]:
    - heading "Kruskal's Algorithm Visualization" [level=1] [ref=e3]
  - generic [ref=e4]:
    - heading "What is Kruskal's Algorithm?" [level=2] [ref=e5]
    - paragraph [ref=e6]: "Kruskal's algorithm is a greedy algorithm that finds a minimum spanning tree (MST) for a connected, weighted graph. It works by:"
    - list [ref=e7]:
      - listitem [ref=e8]: Sorting all the edges in non-decreasing order of their weight
      - listitem [ref=e9]: Picking the smallest edge and checking if it forms a cycle with the spanning tree formed so far
      - listitem [ref=e10]: If no cycle is formed, include the edge in the MST; otherwise, discard it
      - listitem [ref=e11]: Repeat step 2 until there are (V-1) edges in the MST (where V is the number of vertices)
    - paragraph [ref=e12]: This visualization demonstrates how Kruskal's algorithm works step by step.
  - generic [ref=e14]:
    - heading "Graph Controls" [level=3] [ref=e15]
    - generic [ref=e16]:
      - button "Generate Random Graph" [ref=e17] [cursor=pointer]
      - button "Step-by-Step" [ref=e18] [cursor=pointer]
      - button "Play Animation" [ref=e19] [cursor=pointer]
      - button "Reset" [ref=e20] [cursor=pointer]
    - generic [ref=e21]:
      - generic [ref=e22]: "Number of Vertices: 8"
      - 'slider "Number of Vertices: 8" [ref=e23]': "8"
    - generic [ref=e24]:
      - generic [ref=e25]: "Animation Speed: Normal"
      - 'slider "Animation Speed: Normal" [ref=e26]': "3"
    - generic [ref=e27]:
      - heading "Current Step" [level=4] [ref=e28]
      - paragraph [ref=e29]: Click "Step-by-Step" or "Play Animation" to start.
    - generic [ref=e30]: "MST Weight: 0"
```