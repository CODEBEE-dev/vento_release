import { extractComponent } from './utils'

class PIDClimate {
  type;
  platform;
  name;
  sensor;
  heatOutput;
  coolOutput;
  defaultTargetTemp;
  kp;
  ki;
  kd;
  thresholdHigh;
  thresholdLow;

  constructor(name, sensor, heatOutput, coolOutput, defaultTargetTemp, kp, ki, kd, thresholdHigh, thresholdLow) {
    this.type = "climate"
    this.platform = "pid"
    this.name = name
    this.sensor = sensor
    this.heatOutput = heatOutput
    this.coolOutput = coolOutput
    this.defaultTargetTemp = defaultTargetTemp
    this.kp = kp
    this.ki = ki
    this.kd = kd
    this.thresholdHigh = thresholdHigh
    this.thresholdLow = thresholdLow
  }
  attach(pin, deviceComponents) {
    const componentObjects = [
      {
        name: this.type,
        config: {
          platform: this.platform,
          name: this.name,
          id: this.name,
          sensor: this.sensor,
          default_target_temperature: this.defaultTargetTemp,
          control_parameters: {
            kp: this.kp,
            ki: this.ki,
            kd: this.kd,
          },
          deadband_parameters: {
            threshold_high: this.thresholdHigh,
            threshold_low: this.thresholdLow
          }
        },
        subsystem: this.getSubsystem()
      },
      {
        name: "button",
        config: {
          platform: "template",
          name: this.name + "_autotune",
          on_press: [
            {
              "climate.pid.autotune": this.name
            }
          ]
        },
        subsystem: this.getSubsystem()
      }
    ]
    if (this.heatOutput) {
      componentObjects[0].config['heat_output'] = this.heatOutput
    }

    if (this.coolOutput) {
      componentObjects[0].config['cool_output'] = this.coolOutput
    }

    componentObjects.forEach((element, j) => {
      deviceComponents = extractComponent(element, deviceComponents)
    })
    return deviceComponents
  }

  getSubsystem() {
    return {
      name: this.name,
      type: this.type,
      actions: [
        {
          name: 'autotune',
          label: 'Autotune',
          description: 'Automatically tune the PID controller',
          endpoint: "/button/"+this.name+"_autotune/command",
          connectionType: 'mqtt',
          payload: {
            type: 'str',
            value: 'PRESS',
          },
        },
        {
          name: 'set_target_temperature',
          label: 'Set target temperature',
          description: 'Set the target temperature',
          endpoint: "/"+this.type+"/"+this.name+"/target_temperature/command",
          connectionType: 'mqtt',
          payload: {
            type: 'str',
          },
        }
      ],
      monitors: [
        {
          name: 'mode',
          label: 'Mode',
          description: 'Gets the current mode',
          units: '',
          endpoint: "/"+ this.type+"/" + this.name + "/mode/state",
          connectionType: 'mqtt',
        },
        {
          name: 'target_temperature',
          label: 'Target Temperature',
          description: 'Gets the current target temperature',
          units: '°C',
          endpoint: "/"+ this.type+"/" + this.name + "/target_temperature/state",
          connectionType: 'mqtt',
        },
        {
          name: 'action',
          label: 'Action',
          description: 'Gets the current action',
          units: '',
          endpoint: "/"+ this.type+"/" + this.name + "/action/state",
          connectionType: 'mqtt',
        }
      ]
    }
  }
}


export function pidClimate(name, sensor, heatOutput, coolOutput, defaultTargetTemp, kp, ki, kd, thresholdHigh, thresholdLow) {
  return new PIDClimate(name, sensor, heatOutput, coolOutput, defaultTargetTemp, kp, ki, kd, thresholdHigh, thresholdLow)
}