# Page snapshot

```yaml
- generic [ref=e1]:
  - heading "Counting Sort Demonstration" [level=1] [ref=e2]
  - region "Input Section" [ref=e3]:
    - generic [ref=e4]: "Enter a list of non-negative integers (comma or space separated):"
    - textbox "Enter a list of non-negative integers (comma or space separated):" [ref=e5]:
      - /placeholder: e.g. 4, 2, 2, 8, 3, 3, 1
      - text: 4, a, 2
    - button "Sort using Counting Sort" [active] [ref=e6] [cursor=pointer]
    - alert [ref=e7]: Please enter a valid list of non-negative integers separated by commas or spaces.
  - contentinfo [ref=e9]: Counting Sort Visualization © 2024
```