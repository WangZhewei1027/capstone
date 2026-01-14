# Page snapshot

```yaml
- generic [ref=e2]:
  - heading "K-Means Clustering Visualization" [level=1] [ref=e3]
  - generic [ref=e4]:
    - generic [ref=e5]:
      - text: "Number of Clusters (K):"
      - spinbutton "Number of Clusters (K):" [ref=e6]: "3"
      - button "Reset Points" [ref=e7]
      - button "Run K-Means" [ref=e8]
      - button "Step Through" [ref=e9]
    - generic [ref=e10]:
      - text: "Number of Points:"
      - spinbutton "Number of Points:" [ref=e11]: "100"
  - generic [ref=e13]:
    - heading "How K-Means Works:" [level=3] [ref=e14]
    - list [ref=e15]:
      - listitem [ref=e16]: Randomly initialize K cluster centroids
      - listitem [ref=e17]: Assign each point to the nearest centroid
      - listitem [ref=e18]: Recalculate centroid positions based on assigned points
      - listitem [ref=e19]: Repeat steps 2-3 until convergence
    - paragraph [ref=e20]:
      - strong [ref=e21]: "Current Iteration:"
      - text: "0"
    - paragraph [ref=e22]:
      - strong [ref=e23]: "Cluster Summary:"
```