# Page snapshot

```yaml
- generic [ref=e1]:
  - heading "Understanding Directed and Undirected Graphs" [level=1] [ref=e2]
  - generic [ref=e3]:
    - generic [ref=e5] [cursor=pointer]: A
    - generic [ref=e6]:
      - textbox "Node name (A, B, C, ...)" [ref=e7]
      - textbox "Edge (e.g., A->B for directed, A-B for undirected)" [ref=e8]
      - button "Add Node" [ref=e9] [cursor=pointer]
      - button "Add Edge" [active] [ref=e10] [cursor=pointer]
      - generic [ref=e11]: "Invalid edge: A->. Make sure both nodes exist."
```