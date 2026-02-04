export const generateStateCode = (properties, target?: "boards" | "state") => {
    try {
        const root = target === "boards"
            ? `states?.boards`
            : 'board'
        return root + properties
            .filter(v => v)
            .map(k => `?.[${JSON.stringify(k)}]`)
            .join('')
    } catch (err) {
        console.error("cannot generate state code for " + properties + ", ", err)
        return ''
    }
}

const parseParams = (params) => {
    try {
        if (!params) return "{}";
        return `{ ${Object.entries(params).map(([key, value]) => {
            return `\n\t${key}: ${typeof value === 'string' ? `'${value}'` : value}, // ${value}`;
        }).join('')} \n}`;
    } catch (err) {
        return "{}";
    }
}

export const generateActionCode = (actionName, params = null, type?: "board" | "card" | "") => {
    try {
        const paramsString = parseParams(params);
        if (type === "board") {
            return `await board.execute_action({name: "${actionName}", params: ${paramsString}})`
        } else {
            return `await executeAction({name: "${actionName}", params: ${paramsString}})`
        }
    } catch (err) {
        console.error("cannot generate action code for " + actionName + ", ", err)
        return ''
    }
}

export const generateParamCode = (properties) => {
    try {
        const root = 'params'
        return root + properties
            .filter(v => v)
            .map(k => `?.[${JSON.stringify(k)}]`)
            .join('')
    } catch (err) {
        console.error("cannot generate param code for " + properties + ", ", err)
        return ''
    }
}
