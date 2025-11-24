# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - heading "Singly Linked List Demo" [level=1] [ref=e2]
  - generic [ref=e3]:
    - text: This demo shows a simple singly linked list with operations to
    - emphasis [ref=e4]: append
    - text: ","
    - emphasis [ref=e5]: prepend
    - text: ","
    - emphasis [ref=e6]: insert at index
    - text: ","
    - emphasis [ref=e7]: delete by value
    - text: ", and"
    - emphasis [ref=e8]: search
    - text: .
  - form "Append node" [ref=e9]:
    - textbox "Value to append" [ref=e10]
    - button "Append" [ref=e11] [cursor=pointer]
  - form "Prepend node" [ref=e12]:
    - textbox "Value to prepend" [ref=e13]
    - button "Prepend" [ref=e14] [cursor=pointer]
  - form "Insert node at index" [ref=e15]:
    - spinbutton "Index to insert at" [ref=e16]
    - textbox "Value to insert" [ref=e17]
    - button "Insert at Index" [ref=e18] [cursor=pointer]
  - form "Delete node by value" [ref=e19]:
    - textbox "Value to delete" [ref=e20]
    - button "Delete" [ref=e21] [cursor=pointer]
  - form "Search value" [ref=e22]:
    - textbox "Value to search" [ref=e23]
    - button "Search" [ref=e24] [cursor=pointer]
  - generic "Linked list nodes"
  - heading "Console Log" [level=2] [ref=e25]
```