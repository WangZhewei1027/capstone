# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - heading "Sliding Window Technique Visualization" [level=1] [ref=e2]
  - generic [ref=e3]: The sliding window technique is useful for problems involving arrays or strings where you want to consider a subset (window) of elements — often contiguous — and move this window across the array to calculate something, e.g., sums, averages, max/min values. Here we demonstrate it with an integer array and a fixed window size to find the sum of elements in the window as it slides from left to right.
  - generic [ref=e4]:
    - generic [ref=e5]:
      - text: "Array (comma separated):"
      - textbox "Array (comma separated):" [ref=e6]:
        - /placeholder: e.g. 1,3,-2,8,5,7,6
        - text: 1,3,-2,8,5,7,6
    - generic [ref=e7]:
      - text: "Window Size:"
      - spinbutton "Window Size:" [ref=e8]: "3"
    - button "Initialize" [ref=e9] [cursor=pointer]
    - generic [ref=e10]:
      - generic [ref=e11]: "Animation Speed:"
      - slider [ref=e12]: "800"
      - text: 0.8s
  - generic [ref=e13]:
    - generic [ref=e14]: "1"
    - generic [ref=e15]: "3"
    - generic [ref=e16]: "-2"
    - generic [ref=e17]: "8"
    - generic [ref=e18]: "5"
    - generic [ref=e19]: "7"
    - generic [ref=e20]: "6"
  - generic [ref=e21]:
    - button "< Prev" [disabled] [ref=e22]
    - button "Next >" [ref=e23] [cursor=pointer]
    - button "Play ▶" [ref=e24] [cursor=pointer]
    - button "Pause ❚❚" [disabled] [ref=e25]
  - generic [ref=e26]: "Current window sum: 2"
```