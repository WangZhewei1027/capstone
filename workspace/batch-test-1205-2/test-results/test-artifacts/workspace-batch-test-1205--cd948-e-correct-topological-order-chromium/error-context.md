# Page snapshot

```yaml
- generic [ref=e1]:
  - heading "Topological Sort Visualization" [level=1] [ref=e2]
  - generic [ref=e3]:
    - generic [ref=e4]: A -> [B, C]
    - generic [ref=e5]: B -> [D]
    - generic [ref=e6]: C -> [D, E]
    - generic [ref=e7]: D -> [F]
    - generic [ref=e8]: E -> [F]
    - generic [ref=e9]: F -> []
  - button "Perform Topological Sort" [active] [ref=e10]
  - generic [ref=e11]: "Topological Sort Order: A -> B -> C -> D -> E -> F"
```