## Important Note: Persistent Variable/Set Changes in Graph Execution

When executing the graph, any changes made to variables or sets will persist in the JSON format. These changes **do not reset** when you:

- Re-run the graph.
- Modify the graph.
- Press the "Play" button again.

This behavior can lead to unexpected results if you're not aware that the variables retain their last updated values.

### Suggested Best Practices:
1. **Manually Reset Variables**: After executing the graph, verify and reset variables to their intended initial values if needed (via explicit set nodes or by reloading an updated JSON).


### Future Considerations:
- It may be beneficial to implement a mechanism to reset variables to their initial state when the graph is re-executed or modified.
- Until such functionality exists, treat variable changes as persistent unless explicitly reset.

If you encounter unexpected behavior due to this, double-check the state of your variables or sets in the JSON configuration.
