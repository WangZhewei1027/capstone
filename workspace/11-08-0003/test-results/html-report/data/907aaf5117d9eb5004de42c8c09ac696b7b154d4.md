# Page snapshot

```yaml
- generic [ref=e1]:
  - banner [ref=e2]: Longest Common Subsequence
  - generic [ref=e3]:
    - generic [ref=e4]: "Input String 1:"
    - textbox "Input String 1:" [ref=e5]:
      - /placeholder: e.g., ABCDGH
      - text: ABC
    - generic [ref=e6]: "Input String 2:"
    - textbox "Input String 2:" [ref=e7]:
      - /placeholder: e.g., AEDFHR
      - text: XYZ
  - button "Find LCS" [active] [ref=e8] [cursor=pointer]
  - generic [ref=e9]:
    - text: "String 1: ABC"
    - text: "String 2: XYZ"
    - text: "LCS: (Length: 0)"
```