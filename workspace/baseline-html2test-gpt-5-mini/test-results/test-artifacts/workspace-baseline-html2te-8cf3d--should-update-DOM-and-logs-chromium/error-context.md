# Page snapshot

```yaml
- generic [ref=e2]:
  - heading "Queue — FIFO (First In, First Out) Demonstration" [level=1] [ref=e3]
  - generic [ref=e5]:
    - text: "Implementation:"
    - combobox "Implementation:" [ref=e6]:
      - option "Array (push/shift)" [selected]
      - option "Circular Buffer (fixed capacity)"
    - text: "Capacity (circular):"
    - textbox "Capacity (circular):" [ref=e7]: "8"
  - generic [ref=e8]:
    - textbox "Value to enqueue" [ref=e9]
    - button "Enqueue" [ref=e10] [cursor=pointer]
    - button "Dequeue" [ref=e11] [cursor=pointer]
    - button "Peek (front)" [ref=e12] [cursor=pointer]
    - button "Clear" [ref=e13] [cursor=pointer]
    - button "Random" [ref=e14] [cursor=pointer]
  - generic [ref=e15]:
    - generic [ref=e16]: "Size: 0 • Empty: true"
    - generic [ref=e17]: "Front index: - • Rear index: -"
  - generic [ref=e18]:
    - generic [ref=e19]:
      - generic [ref=e21]: Empty
      - generic [ref=e22]: Head/Front is removed first. Tail/Rear is where new elements are added.
    - generic [ref=e23]:
      - generic [ref=e24]:
        - generic [ref=e25]: Operations & complexity
        - list [ref=e26]:
          - listitem [ref=e27]: "enqueue: O(1) amortized (array), O(1) (circular)"
          - listitem [ref=e28]: "dequeue: O(n) (array shift) or O(1) (circular)"
          - listitem [ref=e29]: "peek: O(1)"
      - generic [ref=e30]: Try switching to Circular Buffer to see how head/rear indexes move without shifting elements. Capacity will limit enqueues.
  - generic [ref=e32]: "[11:24:27 PM] Ready — using Array implementation"
  - contentinfo [ref=e33]: "Keyboard: Enter to enqueue, Backspace to dequeue, P to peek"
```