# Page snapshot

```yaml
- generic [ref=e2]:
  - heading "Understanding Huffman Coding" [level=1] [ref=e3]
  - paragraph [ref=e4]: Input a string of characters to explore Huffman coding and its tree structure.
  - generic [ref=e5]:
    - textbox "Enter a string..." [ref=e6]: hello
    - button "Generate Huffman Tree" [active] [ref=e7] [cursor=pointer]
  - generic [ref=e8]:
    - heading "Character Frequencies:" [level=2] [ref=e9]
    - list [ref=e10]:
      - listitem [ref=e11]: "h: 1"
      - listitem [ref=e12]: "e: 1"
      - listitem [ref=e13]: "l: 2"
      - listitem [ref=e14]: "o: 1"
  - generic [ref=e15]:
    - heading "Huffman Tree:" [level=2] [ref=e16]
    - text: "{ \"char\": null, \"freq\": 5, \"left\": { \"char\": null, \"freq\": 2, \"left\": { \"char\": \"h\", \"freq\": 1 }, \"right\": { \"char\": \"e\", \"freq\": 1 } }, \"right\": { \"char\": null, \"freq\": 3, \"left\": { \"char\": \"o\", \"freq\": 1 }, \"right\": { \"char\": \"l\", \"freq\": 2 } } }"
```