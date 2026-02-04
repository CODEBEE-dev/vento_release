export const types = ["auto", "number", "string", "json", "array"]
export const TypeParser = {
    "auto": (v) => v,
    "number": (v, fallbackEnabled, fallbackValue) => {
        const n = Number(v)
        if (!Number.isNaN(n)) return n
        if (fallbackEnabled && fallbackValue !== undefined) {
            const f = Number(fallbackValue)
            return Number.isNaN(f) ? 0 : f
        }
        return 0
    },
    "string": (v, fallbackEnabled, fallbackValue) => {
        if (fallbackEnabled && fallbackValue !== undefined) {
            return String(fallbackValue)
        }

        return String(v)
    },
    "json": (v, fallbackEnabled, fallbackValue) => {
        try {
            if (v === null) return {}
            if (typeof v === "object" && !Array.isArray(v)) {
                return v
            } else {
                if (fallbackEnabled && fallbackValue !== undefined) {
                    let parsed = JSON.parse(fallbackValue)
                    return Array.isArray(parsed) ? {} : parsed
                } else {
                    return {}
                }
            }
        } catch (err) {
            console.error("Cannot parse to type json the value: " + err)
            return {}
        }
    },
    "array": (v, fallbackEnabled, fallbackValue) => {
        try {
            if (Array.isArray(v)) {
                return v
            } else {
                if (fallbackEnabled && fallbackValue !== undefined) {
                    return JSON.parse(fallbackValue)
                } else {
                    return []
                }
            }
        } catch (err) {
            console.error("Cannot parse to type json the value: " + err)
        }
    }
}
