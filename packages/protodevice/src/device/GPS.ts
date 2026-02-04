import { extractComponent } from './utils'

class GPS {
  type;
  name;
  uartBusId;
  updateInterval;

  constructor(name, uartBusId, updateInterval) {
    this.type = "gps"
    this.name = name
    this.uartBusId = uartBusId
    this.updateInterval = updateInterval
  }
  attach(pin, deviceComponents) {
    const componentObjects = [
      {
        name: "external_components",
        config: {
          //@ts-ignore
          source: "github://Protofy-xyz/esphome-components",
          refresh: "0s",
          components: ["gps"]
        }
      },
      {
        name: this.type,
        config: {
          uart_id: this.uartBusId,
          latitude: {
            name: this.name + "_latitude"
          },
          longitude: {
            name: this.name + "_longitude"
          },
          altitude: {
            name: this.name + "_altitude"
          },
          speed: {
            name: this.name + "_speed"
          },
          satellites: {
            name: this.name + "_satellites"
          },
          hdop: {
            name: this.name + "_hdop"
          },
          update_interval: this.updateInterval
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
          name: 'latitude',
          label: 'Latitude',
          description: 'Gets GPS latitude',
          units: 'º',
          endpoint: "/sensor/" + this.name + "_latitude/state",
          connectionType: 'mqtt',
          cardProps: {
            icon: "map",
          }
        },
        {
          name: 'longitude',
          label: 'Longitude',
          description: 'Gets GPS longitude',
          units: 'º',
          endpoint: "/sensor/" + this.name + "_longitude/state",
          connectionType: 'mqtt',
          cardProps: {
            icon: "map",
          }
        },
        {
          name: 'altitude',
          label: 'Altitude',
          description: 'Gets GPS altitude',
          units: 'm',
          endpoint: "/sensor/" + this.name + "_altitude/state",
          connectionType: 'mqtt',
          cardProps: {
            icon: "mountain",
          }
        },
        {
          name: 'speed',
          label: 'Speed',
          description: 'Gets GPS speed',
          units: 'km/h',
          endpoint: "/sensor/" + this.name + "_speed/state",
          connectionType: 'mqtt',
          cardProps: {
            icon: "gauge",
          }
        },
        {
          name: 'satellites',
          label: 'Satellites',
          description: 'Gets number of satellites',
          endpoint: "/sensor/" + this.name + "_satellites/state",
          connectionType: 'mqtt',
          cardProps: {
            icon: "satellite",
          }
        },
        {
          name: 'hdop',
          label: 'Hdop',
          description: 'Gets hdop status',
          endpoint: "/sensor/" + this.name + "_hdop/state",
          connectionType: 'mqtt',
        },
      ]
    }
  }
}


export function gps(name, uartBusId, updateInterval) {
  return new GPS(name, uartBusId, updateInterval)
}