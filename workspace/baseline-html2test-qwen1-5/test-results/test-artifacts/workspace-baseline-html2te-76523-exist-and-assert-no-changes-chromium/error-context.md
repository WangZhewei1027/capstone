# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - heading "Kruskal's Algorithm" [level=1] [ref=e2]
  - paragraph [ref=e3]: "A simple algorithm for finding the maximum sum of all subarray elements is:"
  - list [ref=e4]:
    - listitem [ref=e5]: Start at the first element and work your way down the array.
    - listitem [ref=e6]: The first element is always at its position (in this case, 0). The second element can be found by adding the previous two elements, then subtracting one from each subsequent element until we reach the end.
    - listitem [ref=e7]: The third element is the sum of all the elements before the current element, which is the second element minus the last element added to it.
    - listitem [ref=e8]: The fourth element is the sum of all the elements after the current element, which is the last element subtracted from it.
    - listitem [ref=e9]: The fifth element is the sum of all the elements between the first and fourth elements, which is the first element plus the fourth element.
    - listitem [ref=e10]: The sixth element is the sum of all the elements between the second and fifth elements, which is the second element plus the fourth element.
    - listitem [ref=e11]: The seventh element is the sum of all the elements between the third and sixth elements, which is the third element plus the fourth element.
    - listitem [ref=e12]: The eighth element is the sum of all the elements between the fourth and seventh elements, which is the second element plus the third element.
    - listitem [ref=e13]: The ninth element is the sum of all the elements between the fifth and eighth elements, which is the fourth element plus the third element.
    - listitem [ref=e14]: The tenth element is the sum of all the elements between the sixth and ninth elements, which is the first element plus the third element.
    - listitem [ref=e15]: The eleventh element is the sum of all the elements between the seventh and tenth elements, which is the second element plus the third element.
```