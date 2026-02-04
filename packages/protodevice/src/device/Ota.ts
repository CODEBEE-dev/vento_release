class Ota {
  name
  type
  platform

  constructor(platform = 'esphome') {
    this.name = this.type = 'ota'
    this.platform = platform
  }

  attach(pin, deviceComponents) {
    const componentObjects = [
      {
        name: this.type,
        config: [
          {
            platform: this.platform
          }
        ],
        subsystem: this.getSubsystem()
      }
    ]

    componentObjects.forEach((element, j) => {
      if (!deviceComponents[element.name]) {
        deviceComponents[element.name] = element.config
      } else {
        // If ota already exists, merge the config
        if (Array.isArray(deviceComponents[element.name])) {
          deviceComponents[element.name] = [...deviceComponents[element.name], ...element.config]
        } else {
          deviceComponents[element.name] = element.config
        }
      }
    })
    return deviceComponents
  }

  getSubsystem() {
    return {
      name: this.name,
      type: this.type,
      config: {
        platform: this.platform
      },
      actions: [],
      monitors: []
    }
  }
}

export function ota(platform = 'esphome') {
  return new Ota(platform)
}
