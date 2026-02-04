import dynamic from 'next/dynamic'
import { useThemeSetting } from '@tamagui/next-theme'

// Carga dinámica
const ReactJsonView = dynamic(() => import('@microlink/react-json-view'), { ssr: false })

const customTheme = {
  base00: 'transparent', // background
  base01: 'transparent', // secondary background
  base02: 'transparent', // null value background
  base03: 'var(--gray10)', // guide and identation lines
  base04: 'var(--gray10)', // object size
  base05: 'var(--color)', // ??
  base06: 'var(--color)', // ??
  base07: 'var(--color)', // keys
  base08: 'var(--color)', // ??
  base09: 'var(--orange11)', // strings
  base0A: 'var(--red10)', // null
  base0B: 'var(--green10)', // nested number
  base0C: 'var(--gray10)', // array index
  base0D: 'var(--gray10)', // special characters (regexps, dates, ...)
  base0E: 'var(--purple11)', // booleans
  base0F: 'var(--blue11)', // numbers and copy icon
}

export const JSONView = ({ src, onSelectKey=(key) => {}, ...props }) => {
  const { resolvedTheme } = useThemeSetting()
  const darkMode = resolvedTheme === 'dark'

  let value = src
  if (typeof value !== 'object') {
    value = { value }
  }

  return <ReactJsonView
    theme={customTheme} // old themes darkMode ? 'eighties' : 'rjv-default'
    name={false}
    indentWidth={2}
    displayDataTypes={false}
    quotesOnKeys={false}
    displayObjectSize={false}
    {...props}
    style={{
      backgroundColor: 'transparent',
      ...props?.style,
    }}
    src={value}
  />
}