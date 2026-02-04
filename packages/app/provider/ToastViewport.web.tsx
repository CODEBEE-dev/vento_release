import { ToastViewport as ToastViewportOg } from '@my/ui'

export const ToastViewport = () => {
  return <ToastViewportOg portalToRoot left={0} right={0} top={10} multipleToasts zIndex={110000} flexDirection='column-reverse' />
}
