# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - heading "K-Means Controls" [level=3] [ref=e3]
    - button "Update Clusters" [active] [ref=e4] [cursor=pointer]
    - button "Reset" [ref=e5] [cursor=pointer]
    - text: "Select Number of Clusters (K):"
    - slider "Select Number of Clusters (K):" [ref=e6]: "3"
    - paragraph [ref=e7]: "Number of Clusters: 3"
  - generic [ref=e9]:
    - heading "Information" [level=3] [ref=e10]
    - paragraph [ref=e11]: Click on the canvas to create a new data point.
    - paragraph [ref=e12]: Drag the red dots (centroids) to move them.
    - paragraph [ref=e13]: Use the 'Update Clusters' button to see how points are assigned to the nearest centroid.
    - paragraph [ref=e14]: "Status: Add points to begin."
```