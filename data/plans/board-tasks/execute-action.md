# Execute Action Plan

Use this plan when the user wants to trigger an action, run a command, or perform an operation.

## Important: Handle Misspelled Names

Users often misspell board or card names. **ALWAYS verify names before executing commands.**

### Finding the Correct Board Name
```bash
# List all boards/agents
yarn vento list agents
```

### Finding the Correct Action Name
```bash
# List all cards in a board (actions have type: action)
yarn vento inspect board {boardName}

# Or list all actions/tools across all boards
yarn vento list tools
```

### Name Matching Tips
- If user says "resetear" but action is "reset", use "reset"
- If user says "enviar" but action is "send", use "send"
- If user says "procesar" but action is "process", use "process"
- Match by similarity, not exact spelling

## Steps

1. **Verify the board exists** - List boards and find the closest match:
   ```bash
   yarn vento list agents
   ```

2. **List available actions** in the board:
   ```bash
   yarn vento inspect board {boardName}
   ```

3. **Find the target action** - Match user's intent to actual action names

4. **Check the action's parameters**:
   ```bash
   yarn vento inspect card {boardName}/{actionName}
   ```

5. **Execute the action** with appropriate parameters:
   ```bash
   yarn vento run {boardName}/{actionName} -p '{"param": "value"}'
   ```

6. **Report the result** to the user

## Examples

- User: "Resetea el board" → Find `reset` action, execute it
- User: "Envia una notificacion" → Find `send`/`notify`/`alert` action, run it
- User: "Procesa los datos" → Find `process`/`run` action, execute it
- User: "Limpia todo" → Find `clear`/`clean`/`reset` action
