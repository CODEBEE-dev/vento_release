class MPU6050Interrupt {
  type;
  name;
  platform;
  address;
  updateInterval;
  i2cBusId;
  interruptPin;
  motionThreshold;
  motionDuration;
  constructor(name, platform, i2cBusId, address, updateInterval, interruptPin, motionThreshold, motionDuration) {
    this.type = "sensor"
    this.name = name
    this.platform = platform
    this.address = address
    this.updateInterval = updateInterval
    this.i2cBusId = i2cBusId
    this.interruptPin = interruptPin
    this.motionThreshold = motionThreshold
    this.motionDuration = motionDuration
  }
  attach(pin, deviceComponents) {
    const componentObjects = [
      {
        name: "external_components",
        config: {
          //@ts-ignore
          source: "github://Protofy-xyz/esphome-components",
          refresh: "0s",
          components: ["mpu6050"]
        }
      },
      {
        name: this.type,
        config: {
          platform: this.platform,
          id: this.name,
          address: this.address,
          i2c_id: this.i2cBusId,
          update_interval: this.updateInterval,
          accel_x: { name: `${this.name}_accel_x` },
          accel_y: { name: `${this.name}_accel_y` },
          accel_z: { name: `${this.name}_accel_z` },
          gyro_x: { name: `${this.name}_gyro_x` },
          gyro_y: { name: `${this.name}_gyro_y` },
          gyro_z: { name: `${this.name}_gyro_z` },
          temperature: { name: `${this.name}_temperature` },
          interrupt_pin: {
            number: this.interruptPin,
            allow_other_uses: true
          },
          motion_threshold: this.motionThreshold,
          motion_duration: this.motionDuration,

        },
        subsystem: this.getSubsystem()
      },
      {
        name: 'binary_sensor',
        config: {
          platform: 'gpio',
          pin: {
            number: this.interruptPin,
            allow_other_uses: true
          },
          name: `${this.name}_movement_detected`,
          id: `${this.name}_movement_detected`,
          on_state: {
            then: [
              {
                if: {
                  condition: {
                    lambda: "return x;"
                  },
                  then: [
                    { "logger.log": `Movement detected by the ${this.name} MPU6050, resetting interrupt latch in 2s` },
                    { delay: "2s" },
                    { lambda: 
`ESP_LOGI("MPU6050INT", "Resetting interrupt latch for ${this.name} MPU6050");
id(${this.name}).clear_interrupt_latch();` }
                  ]
                }
              }
            ]
          }
        }
      },
    ]

    componentObjects.forEach((element, j) => {
      if (!deviceComponents[element.name]) {
        deviceComponents[element.name] = element.config
      } else {
        if (!Array.isArray(deviceComponents[element.name])) {
          deviceComponents[element.name] = [deviceComponents[element.name]]
        }
        deviceComponents[element.name] = [...deviceComponents[element.name], element.config]
      }
    })
    return deviceComponents
  }

  getSubsystem() {
    return {
      name: this.name,
      type: this.type,
      monitors: [
        {
          name: 'accel_x',
          label: 'Accelerometer X',
          description: 'Get accelerometer X axis status',
          units: 'm/s²',
          endpoint: "/sensor/" + this.name + "_accel_x/state",
          connectionType: 'mqtt',
        },
        {
          name: 'accel_y',
          label: 'Accelerometer Y',
          description: 'Get accelerometer Y axis status',
          units: 'm/s²',
          endpoint: "/sensor/" + this.name + "_accel_y/state",
          connectionType: 'mqtt',
        },
        {
          name: 'accel_z',
          label: 'Accelerometer Z',
          description: 'Get accelerometer Z axis status',
          units: 'm/s²',
          endpoint: "/sensor/" + this.name + "_accel_z/state",
          connectionType: 'mqtt',
        },
        {
          name: 'gyro_x',
          label: 'Gyroscope X',
          description: 'Get gyroscope X axis status',
          units: '°/s',
          endpoint: "/sensor/" + this.name + "_gyro_x/state",
          connectionType: 'mqtt',
        },
        {
          name: 'gyro_y',
          label: 'Gyroscope Y',
          description: 'Get gyroscope Y axis status',
          units: '°/s',
          endpoint: "/sensor/" + this.name + "_gyro_y/state",
          connectionType: 'mqtt',
        },
        {
          name: 'gyro_z',
          label: 'Gyroscope Z',
          description: 'Get gyroscope Z axis status',
          units: '°/s',
          endpoint: "/sensor/" + this.name + "_gyro_z/state",
          connectionType: 'mqtt',
        },
        {
          name: 'temperature',
          label: 'Temperature',
          description: 'Get temperature status',
          units: '°C',
          endpoint: "/sensor/" + this.name + "_temperature/state",
          connectionType: 'mqtt',
        },
        {
          name: 'motion_detected',
          label: 'Motion Detected',
          description: 'Get motion detected status',
          units: '',
          endpoint: "/binary_sensor/" + this.name + "_movement_detected/state",
          connectionType: 'mqtt',
        }
      ]
    }
  }
}


export function mpu6050interrupt(name, i2cBusId, address, updateInterval, interruptPin, motionThreshold, motionDuration) {
  return new MPU6050Interrupt(name, 'mpu6050', i2cBusId, address, updateInterval, interruptPin, motionThreshold, motionDuration)
}