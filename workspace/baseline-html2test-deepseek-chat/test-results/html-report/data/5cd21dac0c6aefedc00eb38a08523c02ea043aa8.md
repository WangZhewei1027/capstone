# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - heading "Queue Data Structure Demonstration" [level=1] [ref=e2]
  - generic [ref=e3]:
    - generic [ref=e4]:
      - heading "Array-based Queue" [level=2] [ref=e5]
      - generic [ref=e6]:
        - textbox "Enter value to enqueue" [ref=e7]
        - button "Enqueue" [ref=e8] [cursor=pointer]
        - button "Dequeue" [ref=e9] [cursor=pointer]
      - generic [ref=e11]: "Status: Empty | Front: None"
    - generic [ref=e12]:
      - heading "Linked List Queue" [level=2] [ref=e13]
      - generic [ref=e14]:
        - textbox "Enter value to enqueue" [ref=e15]
        - button "Enqueue" [ref=e16] [cursor=pointer]
        - button "Dequeue" [ref=e17] [cursor=pointer]
      - generic [ref=e19]: "Status: Empty | Front: None"
    - generic [ref=e20]:
      - heading "Circular Queue" [level=2] [ref=e21]
      - generic [ref=e22]:
        - textbox "Enter value to enqueue" [ref=e23]
        - button "Enqueue" [ref=e24] [cursor=pointer]
        - button "Dequeue" [ref=e25] [cursor=pointer]
      - generic [ref=e27]: "Status: Empty | Front: None"
  - generic [ref=e28]:
    - heading "Priority Queue" [level=2] [ref=e29]
    - generic [ref=e30]:
      - textbox "Value" [ref=e31]
      - spinbutton [ref=e32]: "1"
      - button "Enqueue with Priority" [ref=e33] [cursor=pointer]
      - button "Dequeue Highest Priority" [ref=e34] [cursor=pointer]
    - generic [ref=e36]: "Status: Empty | Front: None"
```