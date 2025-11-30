# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - heading "Sliding Window Technique Visualization" [level=1] [ref=e2]
  - generic [ref=e3]:
    - text: "Enter array (comma separated):"
    - textbox "Enter array (comma separated):" [ref=e4]: 2,1,5,2,3,2
  - generic [ref=e5]:
    - text: "Window Size (k):"
    - spinbutton "Window Size (k):" [ref=e6]: "3"
    - button "Start" [ref=e7] [cursor=pointer]
    - button "Next Step" [disabled] [ref=e8]
    - button "Reset" [disabled] [ref=e9]
  - generic [ref=e10]: Click "Start" to begin the sliding window demonstration.
  - paragraph [ref=e12]:
    - emphasis [ref=e13]: "Example: Find maximum in each subarray of size k"
```