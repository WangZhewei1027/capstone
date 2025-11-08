# Page snapshot

```yaml
- generic [ref=e1]:
  - banner [ref=e2]: Longest Common Subsequence
  - generic [ref=e3]:
    - generic [ref=e4]: "Input String 1:"
    - textbox "Input String 1:" [ref=e5]:
      - /placeholder: e.g., ABCDGH
      - text: ABCDGH
    - generic [ref=e6]: "Input String 2:"
    - textbox "Input String 2:" [ref=e7]:
      - /placeholder: e.g., AEDFHR
      - text: AEDFHR
  - button "Find LCS" [active] [ref=e8] [cursor=pointer]
  - generic [ref=e9]:
    - text: "String 1:"
    - generic [ref=e10]: ABCDGH
    - text: "String 2:"
    - generic [ref=e11]: AEDFHR
    - text: "LCS: ADH (Length: 3)"
```