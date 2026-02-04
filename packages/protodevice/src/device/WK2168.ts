import { extractComponent } from './utils'

class WK2168 {
  type;
  name;
  i2cBusId;
  address;
  uart1name;
  uart1baudrate;
  uart2name;
  uart2baudrate;

  constructor(name, i2cBusId, address, uart1name, uart1baudrate, uart2name, uart2baudrate) {
    this.type = "wk2168_i2c"
    this.name = name
    this.address = address
    this.i2cBusId = i2cBusId
    this.uart1name = uart1name
    this.uart1baudrate = uart1baudrate
    this.uart2name = uart2name
    this.uart2baudrate = uart2baudrate
  }
  attach(pin, deviceComponents) {
    const componentObjects = [
      {
        name: this.type,
        config: {
          id: this.name,
          address: this.address,
          i2c_id: this.i2cBusId,
          uart: [
            {
              id: this.uart1name,
              channel: 0,
              baud_rate: this.uart1baudrate,
            },
            {
              id: this.uart2name,
              channel: 1,
              baud_rate: this.uart2baudrate
            },
          ]

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
    return {}
  }
}


export function wk2168(name, i2cBusId, address, uart1name, uart1baudrate, uart2name, uart2baudrate) {
  return new WK2168(name, i2cBusId, address, uart1name, uart1baudrate, uart2name, uart2baudrate)
}