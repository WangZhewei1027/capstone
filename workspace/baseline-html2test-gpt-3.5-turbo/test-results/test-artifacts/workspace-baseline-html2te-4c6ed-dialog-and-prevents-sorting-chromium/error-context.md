# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - heading "Bubble Sort Visualization" [level=1] [ref=e2]
  - generic [ref=e3]:
    - textbox "Array input" [ref=e4]: 5,3,8,4,2
    - button "Start Bubble Sort" [ref=e5] [cursor=pointer]
    - text: "Speed:"
    - slider "Speed:" [ref=e6]: "300"
  - generic "Visualization of array bars" [ref=e7]:
    - generic [ref=e8]: "5"
    - generic [ref=e9]: "3"
    - generic [ref=e10]: "8"
    - generic [ref=e11]: "4"
    - generic [ref=e12]: "2"
  - generic "Bubble sort code example" [ref=e13]: "// Bubble Sort pseudocode: function bubbleSort(arr) { let n = arr.length; for (let i = 0; i < n - 1; i++) { for (let j = 0; j < n - i - 1; j++) { if (arr[j] > arr[j + 1]) { // Swap arr[j] and arr[j + 1] let temp = arr[j]; arr[j] = arr[j + 1]; arr[j + 1] = temp; } } } return arr; }"
```