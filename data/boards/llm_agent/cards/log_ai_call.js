const logBoard = params.board || 'unknown'
const logCard = params.card || 'unknown_card'
const model = params.model || ''
const promptMessage = params.message ?? ''
const response = params.response

const timestamp = new Date().toISOString()
const safeTimestamp = timestamp.replace(/[:.]/g, '-')

const safeSegment = (value, fallback) => {
  const text = String(value || '').trim()
  if (!text) return fallback
  return text.replace(/[^a-zA-Z0-9_-]/g, '_')
}

const serialize = (value) => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value, null, 2)
  } catch (stringifyError) {
    return String(value)
  }
}

const extractResponseContent = (value) => {
  if (!value) return ''
  const direct = value?.choices?.[0]?.message?.content
  if (typeof direct === 'string') return direct
  const nested = value?.reply?.choices?.[0]?.message?.content
  if (typeof nested === 'string') return nested
  if (typeof value?.reply === 'string') return value.reply
  return ''
}

const extractResponse = (value) => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      const parsedContent = extractResponseContent(parsed)
      if (parsedContent) return parsedContent
    } catch (err) {
      // Fall back to raw string.
    }
    return value
  }
  const extracted = extractResponseContent(value)
  if (extracted) return extracted
  try {
    return JSON.stringify(value, null, 2)
  } catch (err) {
    return String(value)
  }
}

const safeBoard = safeSegment(logBoard, 'unknown')
const safeCard = safeSegment(logCard, 'unknown_card')
const safeModel = safeSegment(model, 'unknown_model')
const logDir = `logs/ai_calls/${safeBoard}/${safeCard}_${safeTimestamp}`
const promptPath = `${logDir}/prompt-${safeModel}.md`
const outputPath = `${logDir}/output-${safeModel}.md`

const promptContent = serialize(promptMessage)

const responseText = extractResponse(response)
const outputContent = serialize(responseText)

try {
  await API.post(`/api/core/v1/directories?token=${token}`, { path: logDir })
} catch (writeError) {
  console.error('AI logger mkdir error:', writeError)
  return { ok: false, error: writeError?.message || String(writeError) }
}

try {
  await API.post(`/api/core/v1/files/${promptPath}?token=${token}`, { content: promptContent })
  await API.post(`/api/core/v1/files/${outputPath}?token=${token}`, { content: outputContent })
} catch (writeError) {
  console.error('AI logger write error:', writeError)
  return { ok: false, error: writeError?.message || String(writeError) }
}

return { ok: true, path: logDir }
