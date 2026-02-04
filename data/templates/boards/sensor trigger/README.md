# Sensor Trigger Template

Creates a board that monitors a sensor and triggers actions when a threshold is crossed.

## Cards

| Card | Type | Description |
|------|------|-------------|
| **sensor value** | value | Reads the sensor value from a device |
| **thresholded value** | value | Compares sensor value against threshold, returns "above" or "below" |
| **below action** | action | Executed when value is BELOW threshold |
| **above action** | action | Executed when value is ABOVE threshold |

## What to Modify

| Card | Field to Change | Description |
|------|-----------------|-------------|
| **sensor value** | `rulesCode` | Change device ID and sensor path |
| **thresholded value** | `configParams.threshold.defaultValue` | Set the threshold value |
| **below action** | `rulesCode` | Change the action endpoint and device ID |
| **above action** | `rulesCode` | Change the action endpoint and device ID |

## Required Fields to Preserve

- `layouts` - Grid layout configuration
- `graphLayout` - Flow graph positions  
- `boardCode` - The onChange automation logic
- `rules`, `settings`, `icon`

## Name Field

Replace `{{{name}}}` with the board name (lowercase with underscores).
