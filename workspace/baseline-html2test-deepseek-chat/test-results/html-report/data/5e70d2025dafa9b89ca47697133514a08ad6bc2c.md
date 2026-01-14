# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - text: "# Heap Sort Algorithm Demonstration Here's an interactive HTML demonstration of the Heap Sort algorithm: ```html"
  - heading "Heap Sort Algorithm Visualization" [level=1] [ref=e2]
  - generic [ref=e3]:
    - generic [ref=e4]:
      - textbox "Enter numbers separated by commas (e.g., 5, 2, 8, 1, 9)" [ref=e5]
      - button "Reset" [ref=e6] [cursor=pointer]
      - button "Generate Random Array" [ref=e7] [cursor=pointer]
      - button "Start Sorting" [ref=e8] [cursor=pointer]
      - button "Next Step" [ref=e9] [cursor=pointer]
    - generic [ref=e10]:
      - generic [ref=e13]: Unsorted
      - generic [ref=e16]: Heap Node
      - generic [ref=e19]: Current Element
      - generic [ref=e22]: Sorted
    - heading "Heap Structure" [level=3] [ref=e25]
    - generic [ref=e27]: "// Heap Sort Algorithm function heapSort(arr) { let n = arr.length; // Build max heap for (let i = Math.floor(n/2) - 1; i >= 0; i--) { heapify(arr, n, i); } // Extract elements from heap one by one for (let i = n - 1; i > 0; i--) { // Move current root to end [arr[0], arr[i]] = [arr[i], arr[0]]; // Call heapify on the reduced heap heapify(arr, i, 0); } } function heapify(arr, n, i) { let largest = i; // Initialize largest as root let left = 2 * i + 1; // left child let right = 2 * i + 2; // right child // If left child is larger than root if (left < n && arr[left] > arr[largest]) { largest = left; } // If right child is larger than largest so far if (right < n && arr[right] > arr[largest]) { largest = right; } // If largest is not root if (largest !== i) { [arr[i], arr[largest]] = [arr[largest], arr[i]]; // Recursively heapify the affected sub-tree heapify(arr, n, largest); } }"
  - generic [ref=e28]:
    - heading "How Heap Sort Works" [level=2] [ref=e29]
    - paragraph [ref=e30]: Heap Sort is a comparison-based sorting algorithm that uses a binary heap data structure. It has an O(n log n) time complexity, making it efficient for large datasets.
    - heading "Steps:" [level=3] [ref=e31]
    - list [ref=e32]:
      - listitem [ref=e33]:
        - strong [ref=e34]: Build a max heap
        - text: from the input data.
      - listitem [ref=e35]: The largest element is at the root of the heap. Replace it with the last item of the heap followed by reducing the size of the heap by one.
      - listitem [ref=e36]:
        - strong [ref=e37]: Heapify
        - text: the root of the tree.
      - listitem [ref=e38]: Repeat the above steps while the size of the heap is greater than 1.
    - heading "Complexity:" [level=3] [ref=e39]
    - list [ref=e40]:
      - listitem [ref=e41]: "Time Complexity: O(n log n) in all cases"
      - listitem [ref=e42]: "Space Complexity: O(1) as it's an in-place algorithm"
```