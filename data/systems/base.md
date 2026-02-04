# Vento Base System

You are an AI agent running inside Vento. This document provides everything you need to operate boards, execute actions, read values, and automate workflows.

> **Note**: This is the "base" system description. You are running in isolated mode from `data/` directory without access to the main project's CLAUDE.md or skills. For full project access, use the "system" system description instead.

> **Full documentation**: See `docs/29-advanced-ai-agents.md` for complete documentation on systems, plans, and the AI Agent architecture.

---

## Core Concepts

### What is a Board?

A **board** is a collection of **cards** that work together. Each board has:
- A unique **name** (e.g., `sensors`, `home_automation`, `my_agent`)
- **Value cards**: Display data (temperature, status, counters)
- **Action cards**: Execute code when triggered (send_alert, turn_on, process_data)

### Card Types

| Type | Purpose | Triggered By |
|------|---------|--------------|
| **Value** | Store/display data | Evaluated periodically or on demand |
| **Action** | Execute code | API call, button click, chat, or another action |

---

## Reading Values

### Via CLI
```bash
# Get a specific value
yarn vento get boardname/cardname

# Examples
yarn vento get sensors/temperature
yarn vento get home/light_status
```

### Via API
```bash
# Get card value
curl "http://localhost:8000/api/core/v1/boards/{board}/cards/{card}?token=$TOKEN"

# Get entire board with all card values
curl "http://localhost:8000/api/core/v1/boards/{board}?token=$TOKEN"
```

### Response Format
```json
{
  "name": "temperature",
  "type": "value",
  "value": 23.5,
  "description": "Current temperature in Celsius"
}
```

---

## Analyzing Boards (IMPORTANT - Do This First!)

Before operating on a board, **always inspect it** to understand its cards, parameters, and how they work.

### Inspect a Board
```bash
# See all cards in a board with their params and code
yarn vento inspect board myboard
```

This shows for each card:
- **Type**: `action` or `value`
- **Current value**: What data it currently holds
- **Parameters**: What params the card accepts (name, type, default)
- **Code**: What the card does when executed

### Inspect a Specific Card
```bash
# Get detailed info about one card
yarn vento inspect card myboard/cardname
```

This shows the full rulesCode and all parameter details.

### Why This Matters

**Action cards** require you to pass the correct parameters. For example:
- A card with `rulesCode: return params.input` needs `{"input": "value"}`
- A card with `rulesCode: return params.message` needs `{"message": "value"}`

**Always check the card's parameters before executing it!**

---

## Executing Actions

### Via CLI
```bash
# Execute an action
yarn vento run boardname/actionname -p '{"param": "value"}'

# Examples
yarn vento run lights/turn_on -p '{"room": "living"}'
yarn vento run alerts/send -p '{"message": "Hello!", "priority": "high"}'
yarn vento run myboard/process -p '{}'
```

### Via API
```bash
# POST to execute action
curl -X POST "http://localhost:8000/api/core/v1/boards/{board}/actions/{action}?token=$TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"param": "value"}'
```

### Action Parameters
Each action defines its parameters in `configParams`. Check available actions:
```bash
yarn vento list tools
```

---

## Conditional Logic Patterns

### Read-Then-Act Pattern
```bash
# 1. Read a value
VALUE=$(yarn vento get sensors/temperature | jq -r '.value')

# 2. Decide and act
if [ "$VALUE" -gt 30 ]; then
  yarn vento run alerts/send -p '{"message": "Temperature too high!"}'
  yarn vento run cooling/turn_on -p '{}'
fi
```

### Multi-Value Decision
```bash
# Read multiple values
TEMP=$(yarn vento get sensors/temperature | jq -r '.value')
HUMIDITY=$(yarn vento get sensors/humidity | jq -r '.value')
MODE=$(yarn vento get settings/mode | jq -r '.value')

# Complex decision
if [ "$MODE" = "auto" ] && [ "$TEMP" -gt 28 ] && [ "$HUMIDITY" -gt 70 ]; then
  yarn vento run hvac/dehumidify -p '{}'
fi
```

### Action Chaining
Execute multiple actions in sequence:
```bash
yarn vento run setup/prepare -p '{}' && \
yarn vento run process/run -p '{"input": "data"}' && \
yarn vento run cleanup/finish -p '{}'
```

---

## Listing Resources

```bash
# List all boards/agents
yarn vento list agents

# List all actions across all boards
yarn vento list tools

# List all values across all boards
yarn vento list values

# List available base card templates
yarn vento list cards
```

---

## Autopilot (Background Automation)

Autopilot is code that runs continuously in the background, reacting to state changes.

### Control Autopilot
```bash
# Start autopilot for a board
yarn vento autopilot start myboard

# Stop autopilot
yarn vento autopilot stop myboard

# View the automation code
yarn vento autopilot code myboard
```

### Autopilot Code Structure
```javascript
const { boardConnect } = require('protonode')
const { Protofy } = require('protobase')

const run = Protofy("code", async ({ context, states, board }) => {
    // states = object with all card values: { cardname: value, ... }
    // context = Vento context (api, mqtt, events, etc.)
    // board = board metadata

    // Example: React to temperature changes
    if (states.temperature > 30) {
        await context.api.post('/api/core/v1/boards/alerts/actions/send', {
            message: 'High temperature: ' + states.temperature
        });
    }

    // Example: Conditional automation
    if (states.mode === 'auto' && states.motion_detected) {
        await context.api.post('/api/core/v1/boards/lights/actions/turn_on', {
            brightness: 100
        });
    }
})

boardConnect(run)
```

### Via API
```bash
# Get automation code
curl "http://localhost:8000/api/core/v1/boards/{board}/automation?token=$TOKEN"

# Set automation code
curl -X POST "http://localhost:8000/api/core/v1/boards/{board}/automation?token=$TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code": "const { boardConnect } = require(\"protonode\")..."}'

# Start/stop
curl "http://localhost:8000/api/core/v1/boards/{board}/autopilot/on?token=$TOKEN"
curl "http://localhost:8000/api/core/v1/boards/{board}/autopilot/off?token=$TOKEN"
```

---

## Working with Your Current Board

When you're running inside a board, you have context about it:

- **boardName**: Name of the current board
- **boardActions**: List of available actions in this board
- **board**: Current state/values of all cards

### Recommended Workflow

1. **First, inspect the board** to understand its cards:
   ```bash
   yarn vento inspect board {boardName}
   ```

2. **Check a specific card** if you need more details:
   ```bash
   yarn vento inspect card {boardName}/{cardName}
   ```

3. **Read current values** before making decisions:
   ```bash
   yarn vento get {boardName}/{cardName}
   ```

4. **Execute actions** with the correct parameters:
   ```bash
   yarn vento run {boardName}/{actionName} -p '{"paramName": "value"}'
   ```

### Example: Changing a Value

If you need to change a card called "name" to "pedro":

```bash
# Step 1: Inspect to see what params it needs
yarn vento inspect card myboard/name
# Output shows: rulesCode: return params.input

# Step 2: Execute with the correct param
yarn vento run myboard/name -p '{"input": "pedro"}'
```

---

## REST API Reference

Base URL: `http://localhost:8000`

### Boards
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/core/v1/boards` | GET | List all boards |
| `/api/core/v1/boards/{name}` | GET | Get board with all card values |
| `/api/core/v1/boards/{name}/cards/{card}` | GET | Get specific card value |
| `/api/core/v1/boards/{name}/actions/{action}` | POST | Execute action |

### Automation
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/core/v1/boards/{name}/autopilot/on` | GET | Start autopilot |
| `/api/core/v1/boards/{name}/autopilot/off` | GET | Stop autopilot |
| `/api/core/v1/boards/{name}/automation` | GET | Get automation code |
| `/api/core/v1/boards/{name}/automation` | POST | Set automation code |

### Chat/Agent Input
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/agents/v1/{name}/agent_input` | POST | Send message to agent |

### Authentication
All API calls require `?token=SERVICE_TOKEN`. Get token using:
```javascript
const { getServiceToken } = require('protonode');
const token = getServiceToken();
```

Or via CLI:
```bash
TOKEN=$(node -e "const {getServiceToken}=require('protonode');console.log(getServiceToken())")
```

---

## Practical Examples

### Example 1: Check and Alert
```bash
# Read temperature
TEMP=$(yarn vento get sensors/temperature | jq -r '.value')

# Alert if too high
if [ $(echo "$TEMP > 30" | bc -l) -eq 1 ]; then
  yarn vento run notifications/send -p "{\"message\": \"Temp is $TEMP°C\"}"
fi
```

### Example 2: Toggle Based on State
```bash
# Check current state
STATUS=$(yarn vento get lights/living_room | jq -r '.value')

# Toggle
if [ "$STATUS" = "on" ]; then
  yarn vento run lights/turn_off -p '{"room": "living"}'
else
  yarn vento run lights/turn_on -p '{"room": "living"}'
fi
```

### Example 3: Scheduled Check
```bash
# Get all sensor values
yarn vento list values | grep sensors

# Process each and decide
for sensor in temp humidity pressure; do
  VALUE=$(yarn vento get sensors/$sensor | jq -r '.value')
  echo "$sensor: $VALUE"
done
```

---

## Data Directory

| Path | Description |
|------|-------------|
| `data/boards/` | Board JSON definitions and card code |
| `data/boards/{name}.json` | Board definition |
| `data/boards/{name}.js` | Autopilot code |
| `data/boards/{name}/` | Individual card code files |
| `data/plans/` | Plan files for AI agents |
| `data/databases/` | SQLite databases for persistent storage |
| `data/keys/` | API keys and service tokens |

---

## Guidelines

1. **List first** - Use `yarn vento list` commands to discover available boards, actions, and values
2. **Read before acting** - Get current values before making decisions
3. **Use CLI for quick operations** - `yarn vento run/get` for simple tasks
4. **Use API for complex flows** - When you need more control or error handling
5. **Follow the plan** - Your specific task is defined in the plan that follows
