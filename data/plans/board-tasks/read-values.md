# Read Values Plan

Use this plan when the user wants to check, read, or get information about the board state.

## Important: Handle Misspelled Names

Users often misspell board or card names. **ALWAYS verify names before executing commands.**

### Finding the Correct Board Name
```bash
# List all boards/agents
yarn vento list agents
```

### Finding the Correct Card Name
```bash
# List all cards in a board
yarn vento inspect board {boardName}

# Or list all values across all boards
yarn vento list values
```

### Name Matching Tips
- If user says "temperatura" but card is "temperature", use "temperature"
- If user says "nombre" but card is "name", use "name"
- If user says "estado" but card is "status", use "status"
- Match by similarity, not exact spelling

## Steps

1. **Verify the board exists** - List boards and find the closest match:
   ```bash
   yarn vento list agents
   ```

2. **Inspect the board** to see all available cards:
   ```bash
   yarn vento inspect board {boardName}
   ```

3. **Find the relevant cards** - Match user's query to actual card names

4. **Read specific values** that the user is interested in:
   ```bash
   yarn vento get {boardName}/{cardName}
   ```

5. **Summarize** the findings for the user in a clear format

## Examples

- User: "What's the current temperatura?" → Find `temperature` card, read it
- User: "Show me all values" → Inspect the board and list all card values
- User: "What is the nombre set to?" → Find `name` card, read it
- User: "Dame el estado" → Find `status` card, read and report
