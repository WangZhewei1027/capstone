# Page snapshot

```yaml
- generic [ref=e2]:
  - heading "Depth-First Search Visualization" [level=1] [ref=e3]
  - generic [ref=e4]:
    - button "Start DFS" [ref=e5] [cursor=pointer]
    - button "Next Step" [active] [ref=e6] [cursor=pointer]
    - button "Reset" [ref=e7] [cursor=pointer]
    - button "Generate Random Graph" [ref=e8] [cursor=pointer]
    - combobox [ref=e9]:
      - option "Slow"
      - option "Medium" [selected]
      - option "Fast"
    - generic [ref=e10]:
      - text: "Start Node:"
      - spinbutton [ref=e11]: "0"
  - generic [ref=e14]:
    - heading "DFS Status" [level=3] [ref=e15]
    - generic [ref=e16]: DFS completed!
    - heading "Algorithm Steps:" [level=4] [ref=e17]
    - list [ref=e18]:
      - listitem [ref=e19]: Visited node 5
      - listitem [ref=e20]: Added node 2 to stack
      - listitem [ref=e21]: Processing node 2
      - listitem [ref=e22]: Visited node 2
      - listitem [ref=e23]: Added node 1 to stack
      - listitem [ref=e24]: Processing node 1
      - listitem [ref=e25]: Visited node 1
      - listitem [ref=e26]: Processing node 5
      - listitem [ref=e27]: Processing node 1
      - listitem [ref=e28]: Processing node 1
    - heading "Stack Contents:" [level=4] [ref=e29]
    - generic [ref=e30]: Empty
    - heading "Visited Nodes:" [level=4] [ref=e31]
    - generic [ref=e32]: 0, 3, 4, 7, 6, 5, 2, 1
```