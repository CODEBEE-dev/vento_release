import { deepClone } from './utils'
import type { ComponentTemplate, ComponentTemplateContext } from './templateTypes'
import { normalizeGpioHandle, extractPinNumber } from './templateHelpers'

/**
 * Build visual components from binary_sensor YAML config
 *
 * YAML input:
 * binary_sensor:
 *   - platform: gpio
 *     pin: 2
 *     name: button
 *     id: button
 *     filters:
 *       - delayed_off: 100ms
 *       - delayed_on: 100ms
 */
export const buildBinarySensorComponents = (binarySensorConfig: any): any[] => {
  if (!binarySensorConfig) return []
  const sensors = Array.isArray(binarySensorConfig) ? binarySensorConfig : [binarySensorConfig]

  return sensors
    .filter((bs) => bs && bs.platform === 'gpio')
    .map((bs, idx) => {
      // Handle pin as object or number
      const pinConfig = bs.pin
      const pinNumber = typeof pinConfig === 'object' ? pinConfig.number : pinConfig
      const isInverted = typeof pinConfig === 'object' ? pinConfig.inverted : false
      const pinMode = typeof pinConfig === 'object' ? pinConfig.mode : 'INPUT_PULLUP'

      return {
        id: bs.id || `BinarySensor${idx + 1}`,
        type: 'device',
        label: bs.name || `Binary Sensor ${idx + 1}`,
        category: 'binary_sensor',
        meta: {
          kind: 'binary_sensor',
          raw: deepClone(bs),
        },
        editableProps: {
          inverted: {
            type: 'boolean',
            label: 'Inverted',
            description: 'Invert the signal logic (use with pull-up resistors)',
            default: isInverted,
          },
          pullup: {
            type: 'boolean',
            label: 'Internal Pull-up',
            description: 'Enable internal pull-up resistor',
            default: pinMode === 'INPUT_PULLUP',
          },
        },
        pins: {
          left: [
            {
              name: 'input',
              description: 'Digital input pin for the sensor',
              connectedTo: pinNumber !== undefined ? `GPIO${pinNumber}` : null,
              type: 'input',
            },
          ],
          right: [],
        },
      }
    })
}

/**
 * Build subsystems from binary_sensor YAML config
 * Each binary sensor creates a subsystem with a status monitor
 */
export const buildBinarySensorSubsystems = (binarySensorConfig: any): any[] => {
  if (!binarySensorConfig) return []
  const sensors = Array.isArray(binarySensorConfig) ? binarySensorConfig : [binarySensorConfig]

  return sensors
    .filter((bs) => bs && (bs.platform === 'gpio' || bs.type === 'binary_sensor'))
    .map((bs, idx) => {
      const componentId = bs.id || `BinarySensor${idx + 1}`
      const name = bs.id || bs.name || componentId

      return {
        componentId,
        name,
        type: 'binary_sensor',
        monitors: [
          {
            name: 'status',
            label: bs.name || 'Sensor status',
            description: 'Binary sensor state (ON/OFF)',
            endpoint: `/binary_sensor/${name}/state`,
            connectionType: 'mqtt',
          },
        ],
        // Binary sensors are read-only, no actions
        actions: [],
      }
    })
}

/**
 * Template for creating new binary sensor components in the visual editor
 */
export const buildBinarySensorTemplate = (
  context: ComponentTemplateContext
): ComponentTemplate => {
  const sensorIndex = (context.componentCounts['binary_sensor'] || 0) + 1

  return {
    label: 'Binary Sensor / Button',
    description: 'Digital input for buttons, switches, PIR sensors, etc.',
    fields: [
      { name: 'id', label: 'Internal ID', type: 'text', required: true },
      { name: 'label', label: 'Display name', type: 'text' },
      {
        name: 'pin',
        label: 'GPIO',
        type: 'text',
        required: true,
        placeholder: 'GPIO2',
        useConnectionDatalist: true,
      },
      {
        name: 'inverted',
        label: 'Inverted',
        type: 'boolean',
        description: 'Invert signal logic (for active-low buttons)',
      },
      {
        name: 'pullup',
        label: 'Internal Pull-up',
        type: 'boolean',
        description: 'Enable internal pull-up resistor',
      },
    ],
    defaults: {
      id: context.ensureUniqueId(`button${sensorIndex}`),
      label: `Button ${sensorIndex}`,
      pin: '',
      inverted: true,  // Most buttons are active-low
      pullup: true,    // Use internal pull-up by default
    },
    build: (values, helpers) => {
      const id = helpers.ensureUniqueId(values.id || `button${sensorIndex}`)
      const label = values.label || id
      const pin = normalizeGpioHandle(values.pin)
      const pinNumber = extractPinNumber(pin)
      const inverted = !!values.inverted
      const pullup = !!values.pullup

      // Build the raw YAML structure
      const rawConfig: any = {
        id,
        name: label,
        platform: 'gpio',
        pin: pullup || inverted
          ? {
              number: pinNumber,
              mode: pullup ? 'INPUT_PULLUP' : 'INPUT',
              inverted: inverted,
            }
          : pinNumber,
        filters: [
          { delayed_off: '100ms' },
          { delayed_on: '100ms' },
        ],
      }

      return {
        id,
        type: 'device',
        label,
        category: 'binary_sensor',
        meta: {
          kind: 'binary_sensor',
          raw: rawConfig,
        },
        editableProps: {
          inverted: {
            type: 'boolean',
            label: 'Inverted',
            description: 'Invert the signal logic (use with pull-up resistors)',
            default: inverted,
          },
          pullup: {
            type: 'boolean',
            label: 'Internal Pull-up',
            description: 'Enable internal pull-up resistor',
            default: pullup,
          },
        },
        pins: {
          left: [
            {
              name: 'input',
              description: 'Digital input pin for the sensor',
              connectedTo: pin,
              type: 'input',
            },
          ],
          right: [],
        },
      }
    },
  }
}
