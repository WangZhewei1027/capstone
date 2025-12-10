# Page snapshot

```yaml
- generic [ref=e2]:
  - heading "K-Nearest Neighbors (KNN) Example" [level=2] [ref=e3]
  - generic [ref=e4]:
    - text: "Enter distance (e.g., 5):"
    - spinbutton "Enter distance (e.g., 5):" [ref=e5]: "5"
    - text: "Enter data:"
    - textbox "Enter data:" [active] [ref=e6]:
      - /placeholder: Enter data
      - text: "10"
    - button "KNN" [ref=e7] [cursor=pointer]
```