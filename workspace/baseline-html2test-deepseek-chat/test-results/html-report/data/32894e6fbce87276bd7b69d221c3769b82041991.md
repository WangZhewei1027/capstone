# Page snapshot

```yaml
- generic [ref=e2]:
  - heading "Hash Table Visualization" [level=1] [ref=e3]
  - generic [ref=e4]:
    - heading "What is a Hash Table?" [level=3] [ref=e5]
    - paragraph [ref=e6]: A hash table is a data structure that maps keys to values using a hash function to compute an index into an array of buckets. It provides O(1) average time complexity for insertions, deletions, and lookups.
  - generic [ref=e7]:
    - textbox "Enter key" [ref=e8]: apple
    - textbox "Enter value" [ref=e9]: "10"
    - button "Insert" [ref=e10] [cursor=pointer]
    - button "Get Value" [ref=e11] [cursor=pointer]
    - button "Remove" [ref=e12] [cursor=pointer]
    - button "Clear Table" [ref=e13] [cursor=pointer]
    - spinbutton [ref=e14]: "3"
    - button "Resize" [active] [ref=e15] [cursor=pointer]
  - generic [ref=e16]:
    - generic [ref=e17]:
      - generic [ref=e18]: Bucket 0
      - generic [ref=e19]: Empty
    - generic [ref=e20]:
      - generic [ref=e21]: Bucket 1
      - generic [ref=e22]: "orange: 15"
      - generic [ref=e23]: "banana: 20"
      - generic [ref=e24]: "kiwi: 8"
    - generic [ref=e25]:
      - generic [ref=e26]: Bucket 2
      - generic [ref=e27]: "apple: 10"
      - generic [ref=e28]: "grape: 25"
  - generic [ref=e29]: "Table Size: 3 | Items: 5 | Load Factor: 1.67"
```