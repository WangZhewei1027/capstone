# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - heading "Topological Sort Demo" [level=1] [ref=e2]
  - paragraph [ref=e3]: "Enter a directed acyclic graph (DAG) as edges (one per line):"
  - paragraph [ref=e4]:
    - text: "Format:"
    - code [ref=e5]: NodeA NodeB
    - text: means an edge from NodeA → NodeB
  - 'textbox "Example: 5 2 5 0 4 0 4 1 2 3 3 1" [ref=e6]':
    - /placeholder: "Example:\n5 2\n5 0\n4 0\n4 1\n2 3\n3 1"
    - text: 5 2 5 0 4 0 4 1 2 3 3 1
  - button "Run Topological Sort" [ref=e7]
  - generic [ref=e8]: "Visited node: 3 Current topological order: 5 → 4 → 2 → 0 → 3"
  - generic "Graph visualization" [ref=e9]:
    - img [ref=e10]:
      - generic [ref=e15]:
        - generic: "5"
      - generic [ref=e17]:
        - generic: "2"
      - generic [ref=e19]:
        - generic: "0"
      - generic [ref=e21]:
        - generic: "4"
      - generic [ref=e23]:
        - generic: "1"
      - generic [ref=e25]:
        - generic: "3"
```