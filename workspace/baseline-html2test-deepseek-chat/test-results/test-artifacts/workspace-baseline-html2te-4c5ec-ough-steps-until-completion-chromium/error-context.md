# Page snapshot

```yaml
- generic [ref=e2]:
  - heading "Insertion Sort Visualization" [level=1] [ref=e3]
  - generic [ref=e4]:
    - heading "How Insertion Sort Works:" [level=3] [ref=e5]
    - paragraph [ref=e6]: "Insertion Sort builds the final sorted array one item at a time. It:"
    - list [ref=e7]:
      - listitem [ref=e8]: Starts with the second element (considering the first element as sorted)
      - listitem [ref=e9]: Compares the current element with the elements before it
      - listitem [ref=e10]: Shifts larger elements to the right to make space
      - listitem [ref=e11]: Inserts the current element in its correct position
      - listitem [ref=e12]: Repeats until the entire array is sorted
    - paragraph [ref=e13]:
      - strong [ref=e14]: "Time Complexity:"
      - text: O(n²) in worst case, O(n) in best case
    - paragraph [ref=e15]:
      - strong [ref=e16]: "Space Complexity:"
      - text: O(1)
  - generic [ref=e17]:
    - textbox "Enter numbers (e.g., 5,3,8,1,2)" [ref=e18]: 5,3,8,1,2
    - button "Generate Random Array" [ref=e19] [cursor=pointer]
    - button "Start Sorting" [ref=e20] [cursor=pointer]
    - button "Next Step" [disabled] [ref=e21]
    - button "Reset" [ref=e22] [cursor=pointer]
  - generic [ref=e23]: Ready to sort! Click "Start Sorting" to begin.
  - generic [ref=e24]:
    - generic [ref=e25]: "5"
    - generic [ref=e26]: "3"
    - generic [ref=e27]: "8"
    - generic [ref=e28]: "1"
    - generic [ref=e29]: "2"
```