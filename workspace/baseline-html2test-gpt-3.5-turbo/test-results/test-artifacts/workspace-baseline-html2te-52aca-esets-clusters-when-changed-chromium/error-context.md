# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - heading "K-Means Clustering Demo" [level=1] [ref=e2]
  - generic [ref=e3]:
    - paragraph [ref=e4]:
      - strong [ref=e5]: "Instructions:"
      - text: Click inside the white canvas to add points. Set the number of clusters (K) and then click
      - emphasis [ref=e6]: Run K-Means
      - text: to cluster the points into K groups. You can reset the points or run multiple times with different K.
    - paragraph [ref=e7]: The color of points and their cluster centroid will be shown. Centroids are displayed as larger crosses.
  - generic [ref=e8]:
    - generic "K-Means clustering canvas" [ref=e10]
    - region "Controls for clustering" [ref=e11]:
      - generic [ref=e12]: "Number of clusters (K): 3"
      - 'slider "Number of clusters (K): 3" [ref=e13]': "3"
      - button "Run K-Means" [ref=e14] [cursor=pointer]
      - button "Reset Points" [ref=e15] [cursor=pointer]
      - generic [ref=e16]: Click on canvas to add points. Set K and run clustering.
```