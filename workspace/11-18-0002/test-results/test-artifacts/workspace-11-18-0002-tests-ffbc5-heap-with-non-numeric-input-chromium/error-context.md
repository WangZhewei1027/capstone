# Page snapshot

```yaml
- generic [ref=e2]:
  - heading "Heap (Min/Max) Interactive Exploration" [level=1] [ref=e3]
  - textbox "Enter array elements (comma separated)" [ref=e4]
  - button "Build Min/Max Heap" [ref=e5] [cursor=pointer]
  - generic [ref=e6]:
    - heading "Heap Operations" [level=2] [ref=e7]
    - paragraph [ref=e8]: "Select the type of heap you want to build:"
    - generic [ref=e9]:
      - radio "Min Heap" [checked] [ref=e10]
      - text: Min Heap
    - generic [ref=e11]:
      - radio "Max Heap" [ref=e12]
      - text: Max Heap
    - button "Heapify" [ref=e13] [cursor=pointer]
```