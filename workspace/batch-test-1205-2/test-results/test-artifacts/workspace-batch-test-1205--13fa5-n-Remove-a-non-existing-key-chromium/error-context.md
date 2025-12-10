# Page snapshot

```yaml
- generic [ref=e1]:
  - heading "Hash Table Demonstration" [level=1] [ref=e2]
  - text: "Key:"
  - textbox "Key:" [active] [ref=e3]:
    - /placeholder: Enter key
    - text: nonExistentKey
  - text: "Value:"
  - textbox "Value:" [ref=e4]:
    - /placeholder: Enter value
  - button "Insert" [ref=e5]
  - button "Search" [ref=e6]
  - button "Remove" [ref=e7]
  - heading "Hash Table Entries" [level=2] [ref=e8]
  - table [ref=e9]:
    - rowgroup [ref=e10]:
      - row "Index Key Value" [ref=e11]:
        - cell "Index" [ref=e12]
        - cell "Key" [ref=e13]
        - cell "Value" [ref=e14]
    - rowgroup
```