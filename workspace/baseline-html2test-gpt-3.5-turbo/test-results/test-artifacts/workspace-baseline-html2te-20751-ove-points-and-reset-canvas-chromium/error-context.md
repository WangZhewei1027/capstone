# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - heading "K-Means Clustering Interactive Demo" [level=1] [ref=e2]
  - paragraph [ref=e3]: Click on the canvas to add points. Choose number of clusters (k) and click "Run K-Means".
  - generic [ref=e4]:
    - text: "Number of clusters (k):"
    - spinbutton "Number of clusters (k):" [ref=e5]: "3"
    - button "Run K-Means" [ref=e6]
    - button "Reset Clusters" [ref=e7]
    - button "Clear Points" [ref=e8]
  - generic "K-means clustering canvas" [ref=e9]
  - generic [ref=e10]:
    - paragraph [ref=e11]:
      - strong [ref=e12]: "Instructions:"
    - list [ref=e13]:
      - listitem [ref=e14]: Click on the canvas area to add points (data).
      - listitem [ref=e15]: Set the number of clusters (k) you want to group points into.
      - listitem [ref=e16]: Click "Run K-Means" to perform clustering.
      - listitem [ref=e17]: Clusters show colored circles; centroids marked with larger star shapes.
      - listitem [ref=e18]: You can "Reset Clusters" to assign new initial centroids and run again on same points.
      - listitem [ref=e19]: "\"Clear Points\" erases all points and clusters for a fresh start."
```