# Page snapshot

```yaml
- generic [ref=e2]:
  - 'heading "Graph Theory: Directed vs Undirected Graphs" [level=1] [ref=e3]'
  - generic [ref=e4]:
    - generic [ref=e5]:
      - heading "Undirected Graph" [level=2] [ref=e6]
      - generic [ref=e7]:
        - button "Add Node" [ref=e8] [cursor=pointer]
        - button "Add Edge" [ref=e9] [cursor=pointer]
        - button "Clear" [ref=e10] [cursor=pointer]
      - generic [ref=e12]:
        - paragraph [ref=e13]: "Undirected Graph: Edges have no direction. If node A is connected to node B, then B is automatically connected to A."
        - paragraph [ref=e14]:
          - strong [ref=e15]: "Example:"
          - text: Friendship network (if Alice is friends with Bob, Bob is friends with Alice).
    - generic [ref=e16]:
      - heading "Directed Graph (Digraph)" [level=2] [ref=e17]
      - generic [ref=e18]:
        - button "Add Node" [ref=e19] [cursor=pointer]
        - button "Add Edge" [ref=e20] [cursor=pointer]
        - button "Clear" [ref=e21] [cursor=pointer]
      - generic [ref=e23]:
        - paragraph [ref=e24]: "Directed Graph: Edges have direction. A → B means connection from A to B, but not necessarily from B to A."
        - paragraph [ref=e25]:
          - strong [ref=e26]: "Example:"
          - text: Web page links (page A links to page B, but B may not link back to A).
```