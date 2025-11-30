# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - heading "Topological Sort Demo" [level=1] [ref=e2]
  - generic [ref=e3]:
    - text: "Enter Directed Acyclic Graph (DAG) edges (one per line):"
    - textbox "Enter Directed Acyclic Graph (DAG) edges (one per line):" [ref=e4]:
      - /placeholder: "Format: source target\nExample:\n5 2\n5 0\n4 0\n4 1\n2 3\n3 1"
      - text: 5 2 5 0 4 0 4 1 2 3 3 1
    - button "Run Topological Sort" [ref=e5] [cursor=pointer]
    - paragraph [ref=e6]:
      - generic [ref=e7]:
        - text: "Each line defines a directed edge:"
        - code [ref=e8]: source target
        - text: (node names are strings without spaces).
    - paragraph
  - generic [ref=e9]:
    - heading "Result" [level=2] [ref=e10]
    - strong [ref=e12]: "Topological Order:"
```