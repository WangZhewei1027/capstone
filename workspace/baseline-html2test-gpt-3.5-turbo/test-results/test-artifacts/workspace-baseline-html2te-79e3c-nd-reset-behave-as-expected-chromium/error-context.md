# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - heading "K-Nearest Neighbors (KNN) Demonstration" [level=1] [ref=e2]
  - generic [ref=e3]:
    - generic [ref=e4]: "Choose k:"
    - spinbutton "Choose k:" [ref=e5]: "3"
    - button "Clear Data Points" [ref=e6] [cursor=pointer]
    - button "Clear Query Points" [ref=e7] [cursor=pointer]
    - button "Reset All" [ref=e8] [cursor=pointer]
    - generic [ref=e9]:
      - radio "Class A (red)" [checked] [ref=e10]
      - text: Class A (red)
    - generic [ref=e11]:
      - radio "Class B (blue)" [ref=e12]
      - text: Class B (blue)
  - generic "KNN plot area" [ref=e14]
  - generic [ref=e15]:
    - text: Click on canvas to add data points or query points.
    - text: "- Left Click: add point for selected class"
    - text: "- Shift + Click: add query point (unlabeled)"
    - text: Query points will be classified using KNN with chosen k.
  - generic [ref=e16]:
    - text: Class A points
    - text: Class B points
    - text: Query (unlabeled) points
    - text: When clicking query points, colored circle shows predicted class and its neighbors are highlighted.
```