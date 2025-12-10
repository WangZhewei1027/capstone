# Page snapshot

```yaml
- generic [ref=e2]:
  - heading "Selection Sort Algorithm" [level=1] [ref=e3]
  - generic [ref=e4]:
    - heading "How Selection Sort Works:" [level=3] [ref=e5]
    - paragraph [ref=e6]: "Selection Sort repeatedly finds the minimum element from the unsorted portion and places it at the beginning. The algorithm maintains two subarrays: sorted and unsorted."
    - list [ref=e7]:
      - listitem [ref=e8]: Find the minimum element in the unsorted array
      - listitem [ref=e9]: Swap it with the first element of the unsorted portion
      - listitem [ref=e10]: Move the boundary between sorted and unsorted one element to the right
      - listitem [ref=e11]: Repeat until the entire array is sorted
    - paragraph [ref=e12]:
      - strong [ref=e13]: "Time Complexity:"
      - text: O(n²) in all cases
    - paragraph [ref=e14]:
      - strong [ref=e15]: "Space Complexity:"
      - text: O(1)
  - generic [ref=e16]:
    - button "Generate New Array" [ref=e17] [cursor=pointer]
    - button "Start Sorting" [ref=e18] [cursor=pointer]
    - button "Next Step" [active] [ref=e19] [cursor=pointer]
    - button "Reset" [ref=e20] [cursor=pointer]
  - generic [ref=e21]: Click "Start Sorting" to begin
  - generic [ref=e22]:
    - generic [ref=e23]: "94"
    - generic [ref=e24]: "28"
    - generic [ref=e25]: "34"
    - generic [ref=e26]: "49"
    - generic [ref=e27]: "39"
    - generic [ref=e28]: "9"
    - generic [ref=e29]: "13"
    - generic [ref=e30]: "60"
  - generic [ref=e31]: "function selectionSort(arr) { for (let i = 0; i < arr.length - 1; i++) { let minIndex = i; for (let j = i + 1; j < arr.length; j++) { if (arr[j] < arr[minIndex]) { minIndex = j; } } [arr[i], arr[minIndex]] = [arr[minIndex], arr[i]]; } return arr; }"
```