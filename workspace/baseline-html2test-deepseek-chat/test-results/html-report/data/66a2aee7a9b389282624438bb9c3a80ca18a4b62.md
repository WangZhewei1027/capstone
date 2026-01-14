# Page snapshot

```yaml
- generic [ref=e2]:
  - heading "Depth-First Search Visualization" [level=1] [ref=e3]
  - generic [ref=e4]:
    - button "Start DFS" [ref=e5] [cursor=pointer]
    - button "Next Step" [ref=e6] [cursor=pointer]
    - button "Reset" [ref=e7] [cursor=pointer]
    - button "Generate Random Graph" [ref=e8] [cursor=pointer]
    - combobox [ref=e9]:
      - option "Slow"
      - option "Medium"
      - option "Fast" [selected]
    - generic [ref=e10]:
      - text: "Start Node:"
      - spinbutton [ref=e11]: "0"
  - generic [ref=e14]:
    - heading "DFS Status" [level=3] [ref=e15]
    - generic [ref=e16]: Ready to start DFS traversal...
    - heading "Algorithm Steps:" [level=4] [ref=e17]
    - list
    - heading "Stack Contents:" [level=4] [ref=e18]
    - heading "Visited Nodes:" [level=4] [ref=e20]
```