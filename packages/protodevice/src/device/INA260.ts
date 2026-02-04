import { extractComponent } from "./utils"


// sensor:
//   - platform: ina260
//     id: "aa"
//     i2c_id: busaa
//     address: 0x40

//     update_interval: 60s
//     current:
//       name: "INA260 Current"
//     power:
//       name: "INA260 Power"
//     bus_voltage:
//       name: "INA260 Bus Voltage"


class INA260 {
    name;
    platform;
    address;
    type;
    i2cId;
    updateInterval;
    constructor(name, platform, address, i2cId, updateInterval) {
        this.name = name
        this.platform = platform
        this.type = "sensor"
        this.address = address
        this.i2cId = i2cId
        this.updateInterval = updateInterval
    }
  
    attach(pin, deviceComponents) {
        
        const componentObjects = [
            {
                name: this.type,
                config: {
                    platform: this.platform,
                    id: this.name,
                    address: this.address,
                    i2c_id: this.i2cId,
                    update_interval: this.updateInterval,
                    current:{
                        name: `${this.name}_current`
                    },
                    power:{
                        name: `${this.name}_power`
                    },
                    bus_voltage:{
                        name: `${this.name}_bus_voltage`
                    }
                },
                subsystem: this.getSubsystem()
            }
        ]
  
        componentObjects.forEach((element, j) => {
            deviceComponents = extractComponent(element, deviceComponents)
        })

        return deviceComponents;
    }
  
    getSubsystem() {
        return {
            name: this.name,
            type: this.type,
            monitors:[
                {
                    name: "current",
                    label: "Get current",
                    description: "Get current status",
                    units: 'A',
                    endpoint: "/"+this.type+"/"+`${this.name}_current`+"/state",
                    connectionType: "mqtt",
                },
                {
                    name: "power",
                    label: "Get power",
                    description: "Get power status",
                    units: 'W',
                    endpoint: "/"+this.type+"/"+`${this.name}_power`+"/state",
                    connectionType: "mqtt",
                },
                {
                    name: "busvoltage",
                    label: "Get bus voltage",
                    description: "Get bus voltage status",
                    units: 'V',
                    endpoint: "/"+this.type+"/"+`${this.name}_busvoltage`+"/state",
                    connectionType: "mqtt",
                }
            ]
        }
    }
  }
  
  export function ina260(name, address,i2cId,updateInterval) { 
    return new INA260(name, 'ina260',address,i2cId,updateInterval);
  }