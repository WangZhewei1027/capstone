# Page snapshot

```yaml
- generic [ref=e2]:
  - heading "Red-Black Tree Visualization" [level=1] [ref=e3]
  - generic [ref=e4]:
    - spinbutton [ref=e5]
    - button "Insert" [ref=e6] [cursor=pointer]
    - button "Delete" [ref=e7] [cursor=pointer]
    - button "Find" [ref=e8] [cursor=pointer]
    - button "Clear Tree" [ref=e9] [cursor=pointer]
    - button "Generate Random Tree" [ref=e10] [cursor=pointer]
  - generic [ref=e12]:
    - heading "Red-Black Tree Properties:" [level=3] [ref=e13]
    - list [ref=e14]:
      - listitem [ref=e15]: Every node is either RED or BLACK
      - listitem [ref=e16]: Root is always BLACK
      - listitem [ref=e17]: No two consecutive RED nodes (RED node cannot have RED parent or children)
      - listitem [ref=e18]: Every path from root to null leaf has the same number of BLACK nodes
      - listitem [ref=e19]: New insertions are always RED
    - generic [ref=e20]:
      - text: "[4:22:52 PM] Red-Black Tree Visualization Started"
      - text: "[4:22:52 PM] Try inserting values or generating a random tree"
```