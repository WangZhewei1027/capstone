# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - heading "K-Nearest Neighbors (KNN) Interactive Demo" [level=1] [ref=e2]
  - paragraph [ref=e3]:
    - text: This demo lets you add points in two classes (red and blue) by clicking on the canvas. Then, click anywhere on the canvas to classify that new point using the K-Nearest Neighbors algorithm. Adjust the value of
    - strong [ref=e4]: K
    - text: to see how classification changes.
  - generic [ref=e5]:
    - generic [ref=e6]:
      - text: "Select Class to Add:"
      - combobox "Select Class to Add:" [ref=e7]:
        - option "Red" [selected]
        - option "Blue"
    - generic [ref=e8]:
      - text: "K (neighbors):"
      - spinbutton "K (neighbors):" [ref=e9]: "3"
    - button "Clear All Points" [ref=e10] [cursor=pointer]
    - button "Clear Classified Point" [disabled] [ref=e11] [cursor=pointer]
  - paragraph [ref=e12]: "Left-Click: Add training point | Right-Click: Classify point"
  - generic [ref=e15]:
    - generic [ref=e16]: Class Red
    - generic [ref=e18]: Class Blue
    - generic [ref=e20]: Classified Point
    - generic [ref=e22]:
      - img [ref=e23]
      - text: K-Nearest Neighbors
  - generic [ref=e25]: Click on the canvas to add points (red or blue class selected). Then click to classify a new point.
```