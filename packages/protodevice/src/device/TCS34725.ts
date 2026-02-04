import { c } from 'tar';
import { extractComponent } from './utils'

class TCS34725 {
  type;
  platform;
  name;
  i2cBusId;
  address;
  glassAttenuationFactor;
  updateInterval;

  constructor(name, i2cBusId, address, glassAttenuationFactor, updateInterval) {
    this.type = "sensor"
    this.platform = "tcs34725"
    this.name = name
    this.i2cBusId = i2cBusId
    this.address = address
    this.glassAttenuationFactor = glassAttenuationFactor
    this.updateInterval = updateInterval
  }
  attach(pin, deviceComponents) {
    const componentObjects = [
      {
        name: this.type,
        config: {
          platform: this.platform,
          i2c_id: this.i2cBusId,
          address: this.address,
          glass_attenuation_factor: this.glassAttenuationFactor,
          red_channel: {
            name: this.name + "_red_channel",
          },
          green_channel: {
            name: this.name + "_green_channel",
          },
          blue_channel: {
            name: this.name + "_blue_channel",
          },
          clear_channel: {
            name: this.name + "_clear_channel",
          },
          illuminance: {
            name: this.name + "_illuminance",
          },
          color_temperature: {
            name: this.name + "_color_temperature",
          },
          update_interval: this.updateInterval,
        },
        subsystem: this.getSubsystem()
      },
    ]

    componentObjects.forEach((element, j) => {
      deviceComponents = extractComponent(element, deviceComponents)
    })
    return deviceComponents
  }

  getSubsystem() {
    return {
      name: this.name,
      type: this.type,
      monitors: [
        {
          name: 'red_channel',
          label: 'Red Channel',
          description: 'Gets red color percentage',
          units: '%',
          endpoint: "/sensor/" + this.name + "_red_channel/state",
          connectionType: 'mqtt',
          cardProps: {
            icon: "circle",
            color: "$red10"
          }
        },
        {
          name: 'green_channel',
          label: 'Green Channel',
          description: 'Gets green color percentage',
          units: '%',
          endpoint: "/sensor/" + this.name + "_green_channel/state",
          connectionType: 'mqtt',
          cardProps: {
            icon: "circle",
            color: "$green10"
          }
        },
        {
          name: 'blue_channel',
          label: 'Blue Channel',
          description: 'Gets blue color percentage',
          units: '%',
          endpoint: "/sensor/" + this.name + "_blue_channel/state",
          connectionType: 'mqtt',
          cardProps: {
            icon: "circle",
            color: "$blue10"
          }
        },
        {
          name: 'clear_channel',
          label: 'Clear Channel',
          description: 'Gets clear color percentage',
          units: '%',
          endpoint: "/sensor/" + this.name + "_clear_channel/state",
          connectionType: 'mqtt',
          cardProps: {
            icon: "circle",
          }
        },
        {
          name: 'illuminance',
          label: 'Illuminance',
          description: 'Gets illuminance of the color',
          units: 'lx',
          endpoint: "/sensor/" + this.name + "_illuminance/state",
          connectionType: 'mqtt',
          cardProps: {
            icon: "sun",
            color: "$yellow10"
          }
        },
        {
          name: 'color_temperature',
          label: 'Color Temperature',
          description: 'Gets the color temperature',
          units: 'K',
          endpoint: "/sensor/" + this.name + "_color_temperature/state",
          connectionType: 'mqtt',
          cardProps: {
            icon: "thermometer",
          }
        },
      ]
    }
  }
}


export function tcs34725(name, i2cBusId, address, glassAttenuationFactor, updateInterval) {
  return new TCS34725(name, i2cBusId, address, glassAttenuationFactor, updateInterval)
}