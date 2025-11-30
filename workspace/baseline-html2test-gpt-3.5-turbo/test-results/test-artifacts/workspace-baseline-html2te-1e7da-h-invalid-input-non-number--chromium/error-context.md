# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - heading "Interactive Binary Tree" [level=1] [ref=e2]
  - generic [ref=e3]:
    - generic [ref=e4]:
      - text: "Root Node Value:"
      - spinbutton "Root Node Value:" [ref=e5]: "10"
      - button "Set / Reset Root" [ref=e6]
    - generic [ref=e7]:
      - text: "Add Node:"
      - spinbutton [ref=e8]
      - combobox "Child position" [ref=e9]:
        - option "Left Child" [selected]
        - option "Right Child"
      - spinbutton [ref=e10]
      - button "Add" [ref=e11] [cursor=pointer]
  - img "A binary tree diagram with nodes and connections" [ref=e13]:
    - generic "Node with value 10" [ref=e14]:
      - generic: "10"
  - generic [ref=e16]:
    - button "Pre-order Traversal" [ref=e17] [cursor=pointer]
    - button "In-order Traversal" [ref=e18] [cursor=pointer]
    - button "Post-order Traversal" [ref=e19] [cursor=pointer]
    - button "Clear Output" [ref=e20] [cursor=pointer]
```