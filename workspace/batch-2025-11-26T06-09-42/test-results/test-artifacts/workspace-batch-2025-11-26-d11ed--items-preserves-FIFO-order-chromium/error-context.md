# Page snapshot

```yaml
- generic [ref=e2]:
  - heading "Queue (FIFO) Demonstration" [level=1] [ref=e3]
  - paragraph [ref=e4]: A Queue is a "First-In, First-Out" (FIFO) data structure. The first element added to the queue will be the first one to be removed. Think of it like a line of people waiting for a service.
  - generic [ref=e5]:
    - generic [ref=e6]:
      - textbox "Enter an item..." [ref=e7]
      - button "Enqueue (Add to Rear)" [ref=e8] [cursor=pointer]
    - button "Dequeue (Remove from Front)" [ref=e9] [cursor=pointer]
    - button "Peek (View Front)" [ref=e10] [cursor=pointer]
  - heading "Queue Visualization" [level=2] [ref=e11]
  - generic [ref=e12]:
    - generic [ref=e13]: FRONT (Dequeue here)
    - generic [ref=e14]: REAR (Enqueue here)
    - paragraph [ref=e16]: Queue is empty.
  - generic [ref=e17]:
    - strong [ref=e18]: Is Empty?
    - text: "true"
    - strong [ref=e19]: "Size:"
    - text: "0"
    - strong [ref=e20]: "Front Element (Peek):"
    - text: N/A
    - strong [ref=e21]: "Current Queue:"
    - text: "[]"
```