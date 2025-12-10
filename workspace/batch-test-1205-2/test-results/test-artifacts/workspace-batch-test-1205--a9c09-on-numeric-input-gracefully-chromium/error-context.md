# Page snapshot

```yaml
- generic [ref=e1]:
  - heading "Linear Regression Demonstration" [level=1] [ref=e2]
  - heading "Input Data Points" [level=2] [ref=e4]
  - text: "X Values (comma-separated):"
  - textbox "X Values (comma-separated):" [ref=e5]:
    - /placeholder: e.g., 1,2,3,4,5
    - text: a,b,c
  - text: "Y Values (comma-separated):"
  - textbox "Y Values (comma-separated):" [active] [ref=e6]:
    - /placeholder: e.g., 2,3,5,7,11
    - text: 1,2,3
  - button "Plot Linear Regression" [ref=e7]
```