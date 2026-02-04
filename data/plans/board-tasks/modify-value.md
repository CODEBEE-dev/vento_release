# Modify Value Plan

Use this plan when the user wants to change, update, or set a card value.

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

2. **Inspect the board** to find available cards:
   ```bash
   yarn vento inspect board {boardName}
   ```

3. **Find the target card** - Match user's description to actual card names

4. **Check the card's parameters** to understand what params it needs:
   ```bash
   yarn vento inspect card {boardName}/{cardName}
   ```

5. **Execute the action** with the correct parameters:
   ```bash
   yarn vento run {boardName}/{cardName} -p '{"paramName": "newValue"}'
   ```

6. **Verify the change** by reading the card's value:
   ```bash
   yarn vento get {boardName}/{cardName}
   ```

## Examples

- User: "Change nombre to Pedro" → Find `name` card (not "nombre"), run with correct param
- User: "Set temperatura to 25" → Find `temperature` card, update it
- User: "Update estatus to active" → Find `status` card, set to "active"
