# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - heading "Heap (Min Heap / Max Heap) Demonstration" [level=1] [ref=e2]
  - paragraph [ref=e3]: This demo shows how Min Heaps and Max Heaps work. You can insert numbers and extract the root (minimum or maximum) from each heap.
  - generic [ref=e4]:
    - generic [ref=e5]:
      - heading "Min Heap" [level=2] [ref=e6]
      - generic [ref=e7]: "Insert value:"
      - spinbutton "Insert value:" [ref=e8]
      - button "Insert" [ref=e9] [cursor=pointer]
      - button "Extract Min" [ref=e10] [cursor=pointer]
      - generic [ref=e11]: Heap is empty
      - generic [ref=e12]: Root is the smallest element
    - generic [ref=e13]:
      - heading "Max Heap" [level=2] [ref=e14]
      - generic [ref=e15]: "Insert value:"
      - spinbutton "Insert value:" [ref=e16]
      - button "Insert" [ref=e17] [cursor=pointer]
      - button "Extract Max" [ref=e18] [cursor=pointer]
      - generic [ref=e19]: Heap is empty
      - generic [ref=e20]: Root is the largest element
```