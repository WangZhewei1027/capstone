# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - heading "Heap (Min/Max) Demonstration" [level=1] [ref=e2]
  - paragraph [ref=e3]:
    - text: A
    - strong [ref=e4]: Heap
    - text: "is a specialized tree-based data structure that satisfies the heap property: -"
    - strong [ref=e5]: "Min-Heap:"
    - text: Parent node ≤ children -
    - strong [ref=e6]: "Max-Heap:"
    - text: Parent node ≥ children
  - generic [ref=e8]:
    - text: "Choose heap type:"
    - combobox "Choose heap type:" [ref=e9]:
      - option "Min-Heap" [selected]
      - option "Max-Heap"
  - generic [ref=e10]:
    - spinbutton [ref=e11]
    - button "Insert" [ref=e12]
    - button "Extract Root" [ref=e13]
    - button "Clear" [ref=e14]
  - generic [ref=e15]:
    - generic [ref=e16]:
      - heading "Heap Array Representation" [level=2] [ref=e17]
      - generic [ref=e18]: "[]"
    - generic [ref=e19]:
      - heading "Heap Tree Visualization" [level=2] [ref=e20]
      - generic "Heap tree visualization" [ref=e21]: (empty)
```