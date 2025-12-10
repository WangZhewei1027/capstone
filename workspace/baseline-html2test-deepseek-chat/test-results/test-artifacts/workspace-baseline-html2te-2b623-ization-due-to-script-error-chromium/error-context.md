# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - text: "# Quick Sort Visualization I've created an interactive visualization that demonstrates how the Quick Sort algorithm works. You can see step-by-step how the algorithm recursively partitions arrays and sorts elements. ```html"
  - generic [ref=e2]:
    - heading "Quick Sort Visualization" [level=1] [ref=e3]
    - generic [ref=e4]:
      - paragraph [ref=e5]: Quick Sort is a highly efficient sorting algorithm that uses a divide-and-conquer strategy.
      - paragraph [ref=e6]: It works by selecting a 'pivot' element and partitioning the array around it, such that elements less than the pivot are on the left and elements greater than the pivot are on the right. This process is recursively applied to the subarrays.
    - generic [ref=e7]:
      - button "Generate New Array" [ref=e8] [cursor=pointer]
      - button "Start Sorting" [ref=e9] [cursor=pointer]
      - button "Pause" [disabled] [ref=e10]
      - button "Reset" [disabled] [ref=e11]
      - button "Step Forward" [disabled] [ref=e12]
    - generic [ref=e13]:
      - generic [ref=e14]: "Speed:"
      - slider [ref=e15]: "5"
      - generic [ref=e16]: "Array Size:"
      - slider [ref=e17]: "15"
    - generic [ref=e18]: "Step: 0"
    - generic [ref=e19]:
      - generic [ref=e20]:
        - generic [ref=e21]: Comparisons
        - generic [ref=e22]: "0"
      - generic [ref=e23]:
        - generic [ref=e24]: Swaps
        - generic [ref=e25]: "0"
      - generic [ref=e26]:
        - generic [ref=e27]: Recursive Calls
        - generic [ref=e28]: "0"
    - generic [ref=e30]:
      - generic [ref=e33]: Normal Element
      - generic [ref=e36]: Pivot Element
      - generic [ref=e39]: Comparing
      - generic [ref=e42]: Sorted
    - generic [ref=e43]: Click "Generate New Array" to create a random array, then "Start Sorting" to begin the visualization.
    - generic [ref=e44]: "// Quick Sort Algorithm (JavaScript implementation) function quickSort(arr, low, high) { if (low < high) { // Partition the array and get the pivot index let pi = partition(arr, low, high); // Recursively sort elements before and after partition quickSort(arr, low, pi - 1); quickSort(arr, pi + 1, high); } } function partition(arr, low, high) { // Select the rightmost element as pivot let pivot = arr[high]; // Index of smaller element (indicates right position of pivot) let i = low - 1; for (let j = low; j < high; j++) { // If current element is smaller than or equal to pivot if (arr[j] <= pivot) { i++; // Increment index of smaller element swap(arr, i, j); } } swap(arr, i + 1, high); return i + 1; } function swap(arr, i, j) { let temp = arr[i]; arr[i] = arr[j]; arr[j] = temp; }"
```