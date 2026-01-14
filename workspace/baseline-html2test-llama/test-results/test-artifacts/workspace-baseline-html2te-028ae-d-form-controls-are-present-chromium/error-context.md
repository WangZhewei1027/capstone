# Page snapshot

```yaml
- generic [ref=e2]:
  - heading "Priority Queue" [level=2] [ref=e3]
  - generic [ref=e4]:
    - text: "Priority:"
    - spinbutton "Priority:" [ref=e5]
    - text: "Elements:"
    - spinbutton "Elements:" [ref=e6]
    - text: "Operation:"
    - combobox "Operation:" [ref=e7]:
      - option "Insert" [selected]
      - option "Delete"
    - button "Submit" [ref=e8]
```