import DeviceSdksAPI from './deviceSdks/coreApis'
import DeviceCoresAPI from './devicecores/coreApis'
import DeviceBoardsAPI from './deviceBoards/coreApis'
import DeviceDefinitionsAPI from './deviceDefinitions/coreApis'
import DevicesAPI from './devices/coreApis'
import EnrollmentApis from './enrollmentApis'

export default (app, context) => {
  DeviceSdksAPI(app, context)
  DeviceCoresAPI(app, context)
  DeviceBoardsAPI(app, context)
  DeviceDefinitionsAPI(app, context)
  DevicesAPI(app, context)
  EnrollmentApis(app, context)
}