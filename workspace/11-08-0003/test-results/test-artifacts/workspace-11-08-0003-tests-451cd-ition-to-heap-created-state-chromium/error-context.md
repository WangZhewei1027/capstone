# Page snapshot

```yaml
- generic [ref=e1]:
  - 'heading "Understanding Heap Sort: Visualize the Process" [level=1] [ref=e2]'
  - paragraph [ref=e4]:
    - text: Enter a list of numbers (e.g., 5, 3, 8, 4) and click "Create Heap."
    - text: Then click "Heapify" followed by "Sort" to see the sorting process.
  - generic [ref=e5]:
    - textbox "Enter numbers..." [ref=e6]: 5, 3, 8, 4
    - button "Create Heap" [active] [ref=e7] [cursor=pointer]
  - generic [ref=e8]:
    - button "Heapify" [ref=e9] [cursor=pointer]
    - button "Sort" [ref=e10] [cursor=pointer]
    - button "Reset" [ref=e11] [cursor=pointer]
  - list [ref=e13]:
    - listitem [ref=e14]: "5"
    - list [ref=e15]:
      - listitem [ref=e16]: "3"
      - list [ref=e17]:
        - listitem [ref=e18]: "4"
        - list
      - listitem [ref=e19]: "8"
      - list
```