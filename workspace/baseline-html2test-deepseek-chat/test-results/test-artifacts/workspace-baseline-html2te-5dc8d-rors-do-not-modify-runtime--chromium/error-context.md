# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - text: "# Interactive Red-Black Tree Visualization I'll create a comprehensive visualization of a Red-Black Tree with insertion functionality and detailed animations to demonstrate how this self-balancing binary search tree works. ```html"
  - generic [ref=e2]:
    - banner [ref=e3]:
      - heading "Red-Black Tree Visualization" [level=1] [ref=e4]
      - paragraph [ref=e5]: A Red-Black Tree is a self-balancing binary search tree where each node contains an extra bit for denoting the color of the node (red or black). These trees maintain balance by ensuring that no path from the root to a leaf is more than twice as long as any other path.
    - generic [ref=e6]:
      - generic [ref=e7]:
        - generic [ref=e8]:
          - generic [ref=e9]: "Enter a value to insert:"
          - spinbutton "Enter a value to insert:" [ref=e10]
          - button "Insert Value" [ref=e11] [cursor=pointer]
        - generic [ref=e12]:
          - button "Insert Random Value" [ref=e13] [cursor=pointer]
          - button "Clear Tree" [ref=e14] [cursor=pointer]
          - button "Show Balance Properties" [ref=e15] [cursor=pointer]
        - generic [ref=e16]:
          - heading "Red-Black Tree Properties:" [level=3] [ref=e17]
          - list [ref=e18]:
            - listitem [ref=e19]: Every node is either RED or BLACK
            - listitem [ref=e20]: The root is always BLACK
            - listitem [ref=e21]: All leaves (NIL) are BLACK
            - listitem [ref=e22]: If a node is RED, both children are BLACK
            - listitem [ref=e23]: Every path from a node to its NIL descendants has the same number of BLACK nodes
        - generic [ref=e24]:
          - generic [ref=e27]: Red Node
          - generic [ref=e30]: Black Node
      - generic [ref=e31]:
        - heading "Tree Visualization" [level=2] [ref=e32]
        - img [ref=e34]
        - generic [ref=e35]:
          - heading "Operation History:" [level=3] [ref=e36]
          - generic [ref=e38]: Tree initialized
    - contentinfo [ref=e39]:
      - paragraph [ref=e40]: Red-Black Tree Visualization | Created for educational purposes
```