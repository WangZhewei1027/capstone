# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - heading "K-Nearest Neighbors (KNN) Example" [level=1] [ref=e2]
  - generic [ref=e3]:
    - text: "Features:"
    - textbox "Features:" [ref=e4]
    - text: "K:"
    - spinbutton "K:" [ref=e5]
    - text: "Distance metric:"
    - combobox "Distance metric:" [ref=e6]:
      - option "Euclidean" [selected]
      - option "Manhattan"
    - button "Calculate KNN" [ref=e7]
```