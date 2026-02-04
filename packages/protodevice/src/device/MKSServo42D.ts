class MKSServo42 {
    type;
    name;
    canBusId;
    motorId;
    updateInterval;
    constructor(name, canBusId, motorId, updateInterval) {
        this.type = 'motor'
        this.name = name
        this.canBusId = canBusId
        this.motorId = motorId
        this.updateInterval = updateInterval
    }
    extractNestedComponents(element, deviceComponents) {
      const keysToExtract = [
        { key: 'mqtt', nestedKey: 'on_message' },
        { key: 'mqtt', nestedKey: 'on_json_message' },
        { key: 'canbus', nestedKey: 'on_frame' }
      ];
    
      keysToExtract.forEach(({ key, nestedKey }) => {
        if (element.config[nestedKey]) {
          if(!deviceComponents[key]) deviceComponents[key] = {}
          if(!deviceComponents[key][nestedKey]) deviceComponents[key][nestedKey] = []
  
          if(Array.isArray(deviceComponents[key][nestedKey])){
            deviceComponents[key][nestedKey].push(...element.config[nestedKey])
          } else {
            deviceComponents[key][nestedKey] = {
              ...deviceComponents[key][nestedKey],
              ...element.config[nestedKey]
            }
          }
        }
      });
    }
  
    extractComponent(element, deviceComponents) {
      if (['mqtt', 'canbus'].includes(element.name)) {
        this.extractNestedComponents(element, deviceComponents)
      } else {
        if (!deviceComponents[element.name]) {
          deviceComponents[element.name] = element.config
        } else {
          if (!Array.isArray(deviceComponents[element.name])) {
            deviceComponents[element.name] = [deviceComponents[element.name]]
          }
          deviceComponents[element.name].push(element.config)
        }
      }
    }
    attach(pin, deviceComponents) {
        const componentObjects = [
          {
            name: "external_components",
            config: {
                //@ts-ignore
                source: "github://Protofy-xyz/esphome-components",
                refresh: "0s",
                components: ["mks42d"]
            }
          },
          {
            name: 'mks42d',
            config: {
              id: this.name,
              can_bus_id: this.canBusId,
              can_id: this.motorId,
              throttle: this.updateInterval
            },
            subsystem: this.getSubsystem(),
          },
          {
            name: 'canbus',
            config: {
              on_frame: [
                {
                  can_id: this.motorId,
                  then: {
                    lambda:
`id(${this.name}).process_frame(x);`
                  }
                }
              ]
            }
          },
          {
            name: 'mqtt',
            config: {
              on_json_message: [
                {
                  topic: `devices/${deviceComponents.esphome.name}/${this.type}/${this.name}/set_target_position`,
                  then: {
                    "mks42d.set_target_position": {
                      id: `${this.name}`,
                      target_position: `@!lambda 'return x["target_position"].as<int>();'@`,
                      speed: `@!lambda 'return x["speed"].as<int>();'@`,
                      acceleration: `@!lambda 'return x["acceleration"].as<int>();'@`
                    }
                  }
                },
                {
                  topic: `devices/${deviceComponents.esphome.name}/${this.type}/${this.name}/set_speed`,
                  then: {
                    "mks42d.set_speed": {
                      id: `${this.name}`,
                      speed: `@!lambda 'return x["speed"].as<int>();'@`,
                      acceleration: `@!lambda 'return x["acceleration"].as<int>();'@`,
                      direction: `@!lambda 'return x["direction"].as<std::string>();'@`
                    }
                  }
                },
                {
                  topic: `devices/${deviceComponents.esphome.name}/${this.type}/${this.name}/set_no_limit_reverse`,
                  then: {
                    "mks42d.set_no_limit_reverse": {
                      id: `${this.name}`,
                      degrees: `@!lambda 'return x["degrees"].as<int>();'@`,
                      current_ma: `@!lambda 'return x["current_ma"].as<int>();'@`
                    }
                  }
                },
                {
                  topic: `devices/${deviceComponents.esphome.name}/${this.type}/${this.name}/set_home_params`,
                  then: {
                    "mks42d.set_home_params": {
                      id: `${this.name}`,
                      hm_trig_level: `@!lambda 'return x["hm_trig_level"].as<bool>();'@`,
                      hm_dir: `@!lambda 'return x["hm_dir"].as<std::string>();'@`,
                      hm_speed: `@!lambda 'return x["hm_speed"].as<int>();'@`,
                      end_limit: `@!lambda 'return x["end_limit"].as<bool>();'@`,
                      sensorless_homing: `@!lambda 'return x["sensorless_homing"].as<bool>();'@`
                    }
                  }
                },
                {
                  topic: `devices/${deviceComponents.esphome.name}/${this.type}/${this.name}/set_direction`,
                  then: {
                    "mks42d.set_direction": {
                      id: `${this.name}`,
                      dir: `@!lambda 'return x["direction"].as<std::string>();'@`
                    }
                  }
                },
                {
                  topic: `devices/${deviceComponents.esphome.name}/${this.type}/${this.name}/set_microstep`,
                  then: {
                    "mks42d.set_microstep": {
                      id: `${this.name}`,
                      microstep: `@!lambda 'return x["microstep"].as<int>();'@`
                    }
                  }
                },
                {
                  topic: `devices/${deviceComponents.esphome.name}/${this.type}/${this.name}/set_hold_current`,
                  then: {
                    "mks42d.set_hold_current": {
                      id: `${this.name}`,
                      percent: `@!lambda 'return x["percent"].as<int>();'@`
                    }
                  }
                },
                {
                  topic: `devices/${deviceComponents.esphome.name}/${this.type}/${this.name}/set_working_current`,
                  then: {
                    "mks42d.set_working_current": {
                      id: `${this.name}`,
                      ma: `@!lambda 'return x["ma"].as<int>();'@`
                    }
                  }
                },
                {
                  topic: `devices/${deviceComponents.esphome.name}/${this.type}/${this.name}/set_mode`,
                  then: {
                    "mks42d.set_mode": {
                      id: `${this.name}`,
                      mode: `@!lambda 'return x["mode"].as<int>();'@`
                    }
                  }
                }
              ],
              on_message: [
                {
                  topic: `devices/${deviceComponents.esphome.name}/${this.type}/${this.name}/send_home`,
                  then: {
                    "mks42d.send_home": {
                      id: `${this.name}`,
                    }
                  }
                },
                {
                  topic: `devices/${deviceComponents.esphome.name}/${this.type}/${this.name}/enable_rotation`,
                  then: {
                    "mks42d.enable_rotation": {
                      id: `${this.name}`,
                      state: `@!lambda "return std::string(x);"@`
                    }
                  }
                },
                {
                  topic: `devices/${deviceComponents.esphome.name}/${this.type}/${this.name}/send_limit_remap`,
                  then: {
                    "mks42d.send_limit_remap": {
                      id: `${this.name}`,
                      state: `@!lambda "return std::string(x);"@`
                    }
                  }
                },
                {
                  topic: `devices/${deviceComponents.esphome.name}/${this.type}/${this.name}/unstall`,
                  then: {
                    "mks42d.unstall_command": {
                      id: `${this.name}`,
                    }
                  }
                },

                {
                  topic: `devices/${deviceComponents.esphome.name}/${this.type}/${this.name}/set_0`,
                  then: {
                    "mks42d.set_0": {
                      id: `${this.name}`
                    }
                  }
                },
                {
                  topic: `devices/${deviceComponents.esphome.name}/${this.type}/${this.name}/set_protection`,
                  then: {
                    "mks42d.set_protection": {
                      id: `${this.name}`,
                      state: `@!lambda "return std::string(x);"@`
                    }
                  }
                },
              ]
            }
          },
          {
            name: 'text_sensor',
            config: { 
              platform: "mks42d",
              step_state: {
                id: `${this.name}_step_state`,
                name: `${this.name} step state`,
                on_value: {
                  then: [
                    {
                      if: {
                        condition: {
                          lambda: `return x != "run starting";`
                        },
                        then: [
                          {
                            "mqtt.publish": {
                              topic: `devices/${deviceComponents.esphome.name}/${this.type}/${this.name}/set_target_position/reply`,
                              payload: `@!lambda 'return x;'@`
                            }
                          },
                        ]
                      }
                    }
                  ]
                }
              },
              home_state: {
                id: `${this.name}_home_state`,
                name: `${this.name} home state`,
              },
              in1_state: {
                id: `${this.name}_in1_state`,
                name: `${this.name} in1 state`,
              },
              in2_state: {
                id: `${this.name}_in2_state`,
                name: `${this.name} in2 state`,
              },
              out1_state: {
                id: `${this.name}_out1_state`,
                name: `${this.name} out1 state`,
              },
              out2_state: {
                id: `${this.name}_out2_state`,
                name: `${this.name} out2 state`,
              },
              stall_state: {
                id: `${this.name}_stall_state`,
                name: `${this.name} stall state`,
              },
            }
          },
        ]
    
        componentObjects.forEach((element, j) => {
          this.extractComponent(element, deviceComponents)
        })
        return deviceComponents
      }
      getSubsystem() {
        return {
          name: this.name,
          type: this.type,
          actions: [
            {
              name: 'set_target',
              label: 'Target',
              description: 'Sets target position of the stepper motor',
              endpoint: `/${this.type}/${this.name}/set_target_position`,
              connectionType: 'mqtt',
              mode: 'request-reply',
              replyTimeoutMs: 60000,
              payload: {
                type: 'json-schema',
                schema: {
                  target_position: { 
                    type: 'int', 
                    description: 'Target position in encoder pulses (can be negative)',
                    min: -2147483648,
                    max: 2147483647
                  },
                  speed: { 
                    type: 'int', 
                    description: 'Movement speed in RPM',
                    min: 0,
                    max: 3000
                  },
                  acceleration: { 
                    type: 'int', 
                    description: 'Acceleration value',
                    min: 0,
                    max: 255
                  }
                }
              },
            },
            {
              name: 'set_speed',
              label: 'Speed',
              description: 'Set speed and acceleration for continuous rotation',
              endpoint: `/${this.type}/${this.name}/set_speed`,
              connectionType: 'mqtt',
              payload: {
                type: 'json-schema',
                schema: {
                  speed: { 
                    type: 'int', 
                    description: 'Rotation speed in RPM',
                    min: 0,
                    max: 3000
                  },
                  acceleration: { 
                    type: 'int', 
                    description: 'Acceleration value',
                    min: 0,
                    max: 255
                  },
                  direction: { 
                    type: 'string',
                    description: 'Rotation direction',
                    enum: ['CW', 'CCW']
                  }
                }
              },
            },
            {
              name: 'set_no_limit_reverse',
              label: 'Set no-limit reverse',
              description: 'Configure reverse motion without limit switch',
              endpoint: `/${this.type}/${this.name}/set_no_limit_reverse`,
              connectionType: 'mqtt',
              payload: {
                type: 'json-schema',
                schema: {
                  degrees: { 
                    type: 'int', 
                    description: 'Degrees to reverse',
                    min: 0,
                    max: 360
                  },
                  current_ma: { 
                    type: 'int', 
                    description: 'Current limit in milliamps',
                    min: 0,
                    max: 3000
                  }
                }
              },
            },
            {
              name: 'home',
              label: 'Home',
              description: 'Homes the stepper to the zero position',
              endpoint: `/${this.type}/${this.name}/send_home`,
              connectionType: 'mqtt',
              payload: {
                type: 'str',
                value: 'ON',
              },
            },
            {
              name: 'hold_motor',
              label: 'Hold motor',
              description: "Enables motor hold current, preventing free movement",
              endpoint: `/${this.type}/${this.name}/enable_rotation`,
              connectionType: 'mqtt',
              payload: {
                type: 'str',
                value: 'ON',
              },
            },
            {
              name: 'release_motor',
              label: 'Release motor',
              description: 'Disables motor hold, allowing free shaft rotation',
              endpoint: `/${this.type}/${this.name}/enable_rotation`,
              connectionType: 'mqtt',
              payload: {
                type: 'str',
                value: 'OFF',
              },
            },
            {
              name: 'enable_limit_remap',
              label: 'Enable limit remap',
              description: 'Enables limit switch remapping function',
              endpoint: `/${this.type}/${this.name}/send_limit_remap`,
              connectionType: 'mqtt',
              payload: {
                type: 'str',
                value: 'ON',
              },
            },
            {
              name: 'disable_limit_remap',
              label: 'Disable limit remap',
              description: 'Disables limit switch remapping function',
              endpoint: `/${this.type}/${this.name}/send_limit_remap`,
              connectionType: 'mqtt',
              payload: {
                type: 'str',
                value: 'OFF',
              },
            },
            {
              name: 'unstall',
              label: 'Unstall motor',
              description: 'Clears a stall condition and re-enables motor',
              endpoint: `/${this.type}/${this.name}/unstall`,
              connectionType: 'mqtt',
              payload: {
                type: 'str',
                value: 'ON',
              },
            },
            {
              name: 'set_direction',
              label: 'Set direction',
              description: 'Sets the default motor rotation direction',
              endpoint: `/${this.type}/${this.name}/set_direction`,
              connectionType: 'mqtt',
              payload: {
                type: 'json-schema',
                schema: {
                  direction: {
                    type: 'str',
                    description: 'Rotation direction',
                    enum: ['CW', 'CCW']
                  }
                }
              },
            },
            {
              name: 'set_microstep',
              label: 'Set microstep',
              description: 'Sets the microstepping subdivision value',
              endpoint: `/${this.type}/${this.name}/set_microstep`,
              connectionType: 'mqtt',
              payload: {
                type: 'json-schema',
                schema: {
                  microstep: {
                    type: 'int',
                    description: 'Microstep subdivision',
                    enum: [1, 2, 4, 8, 16, 32, 64, 128, 256]
                  }
                }
              },
            },
            {
              name: 'set_hold_current',
              label: 'Set hold current',
              description: 'Sets the holding current percentage when motor is idle',
              endpoint: `/${this.type}/${this.name}/set_hold_current`,
              connectionType: 'mqtt',
              payload: {
                type: 'json-schema',
                schema: {
                  percent: {
                    type: 'int',
                    description: 'Hold current percentage',
                    min: 0,
                    max: 100
                  }
                }
              },
            },
            {
              name: 'set_working_current',
              label: 'Set working current',
              description: 'Sets the motor current during movement',
              endpoint: `/${this.type}/${this.name}/set_working_current`,
              connectionType: 'mqtt',
              payload: {
                type: 'json-schema',
                schema: {
                  ma: {
                    type: 'int',
                    description: 'Working current in milliamps',
                    min: 0,
                    max: 3000
                  }
                }
              },
            },
            {
              name: 'set_mode',
              label: 'Set mode',
              description: 'Sets the motor control mode',
              endpoint: `/${this.type}/${this.name}/set_mode`,
              connectionType: 'mqtt',
              payload: {
                type: 'json-schema',
                schema: {
                  mode: {
                    type: 'int',
                    description: 'Control mode: 0=CR_OPEN, 1=CR_CLOSE, 2=CR_vFOC, 3=SR_OPEN, 4=SR_CLOSE, 5=SR_vFOC',
                    enum: [0, 1, 2, 3, 4, 5]
                  }
                }
              },
            },
            {
              name: 'set_home_params',
              label: 'Set homing parameters',
              description: 'Configures motor homing behavior and parameters',
              endpoint: `/${this.type}/${this.name}/set_home_params`,
              connectionType: 'mqtt',
              payload: {
                type: 'json-schema',
                schema: {
                  hm_trig_level: { 
                    type: 'bool',
                    description: 'Home switch trigger level (true=HIGH, false=LOW)'
                  },
                  hm_dir: { 
                    type: 'string',
                    description: 'Homing direction',
                    enum: ['CW', 'CCW']
                  },
                  hm_speed: { 
                    type: 'int',
                    description: 'Homing speed in RPM',
                    min: 0,
                    max: 3000
                  },
                  end_limit: { 
                    type: 'bool',
                    description: 'Enable end limit switch'
                  },
                  sensorless_homing: { 
                    type: 'bool',
                    description: 'Enable sensorless homing (stall detection)'
                  },
                }
              }
            },
            {
              name: 'set_0',
              label: 'Set 0 position',
              description: 'Sets the current shaft position as the zero reference',
              endpoint: `/${this.type}/${this.name}/set_0`,
              connectionType: 'mqtt',
              payload: {
                type: 'str',
                value: 'ON',
              },
            },
            {
              name: 'enable_protection',
              label: 'Enable protection mode',
              description: 'Enables motor stall and overload protection',
              endpoint: `/${this.type}/${this.name}/set_protection`,
              connectionType: 'mqtt',
              payload: {
                type: 'str',
                value: 'ON',
              },
            },
            {
              name: 'disable_protection',
              label: 'Disable protection mode',
              description: 'Disables motor stall and overload protection',
              endpoint: `/${this.type}/${this.name}/set_protection`,
              connectionType: 'mqtt',
              payload: {
                type: 'str',
                value: 'OFF',
              },
            }
          ],
          monitors: [
            {
              name: "step_state",
              label: "Step state",
              description: "State after a step command",
              endpoint: `/sensor/${this.name}_step_state/state`,
              connectionType: "mqtt",
            },
            {
              name: "home_state",
              label: "Homing state",
              description: "State after homing",
              endpoint: `/sensor/${this.name}_home_state/state`,
              connectionType: "mqtt",
            },
            {
              name: "stall_state",
              label: "Stall state",
              description: "Reports whether the motor is stalled",
              endpoint: `/sensor/${this.name}_stall_state/state`,
              connectionType: "mqtt",
            },
            {
              name: "in1_state",
              label: "IN1 state",
              description: "State of IN1 input",
              endpoint: `/sensor/${this.name}_in1_state/state`,
              connectionType: "mqtt",
            },
            {
              name: "in2_state",
              label: "IN2 state",
              description: "State of IN2 input",
              endpoint: `/sensor/${this.name}_in2_state/state`,
              connectionType: "mqtt",
            },
            {
              name: "out1_state",
              label: "OUT1 state",
              description: "State of OUT1 output",
              endpoint: `/sensor/${this.name}_out1_state/state`,
              connectionType: "mqtt",
            },
            {
              name: "out2_state",
              label: "OUT2 state",
              description: "State of OUT2 output",
              endpoint: `/sensor/${this.name}_out2_state/state`,
              connectionType: "mqtt",
            }
          ]
        }
      }

}

export function mksServo42(name, canBusId, motorId, updateInterval) { 
    return new MKSServo42(name, canBusId, motorId, updateInterval);
}
