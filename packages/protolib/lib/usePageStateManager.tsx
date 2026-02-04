import { useCallback, useMemo } from 'react'

export const usePageStateManager = ({ setState, pushToUrl, mergePushToUrl, removePushFromUrl, replaceToUrl }) => {
    const mergeState = useCallback((updates: Record<string, any>) => {
        if (!updates || typeof updates !== 'object') {
            return
        }
        setState((prev) => {
            let changed = false
            const nextState = { ...prev }
            Object.entries(updates).forEach(([key, value]) => {
                if (nextState[key] !== value) {
                    nextState[key] = value
                    changed = true
                }
            })
            return changed ? nextState : prev
        })
    }, [])

    const removeStateKeys = useCallback((keys: string | string[]) => {
        const keysArr = Array.isArray(keys) ? keys : [keys]
        if (!keysArr.length) {
            return
        }
        setState((prev) => {
            let changed = false
            const nextState = { ...prev }
            keysArr.forEach((key) => {
                if (key in nextState) {
                    delete nextState[key]
                    changed = true
                }
            })
            return changed ? nextState : prev
        })
    }, [])

    return useMemo(() => ({
        push: (key: string, value: any) => {
            mergeState({ [key]: value })
            pushToUrl(key, value)
        },
        mergePush: (updates: Record<string, any>) => {
            mergeState(updates)
            mergePushToUrl(updates)
        },
        removePush: (keys: string | string[]) => {
            removeStateKeys(keys)
            removePushFromUrl(keys)
        },
        replace: (key: string, value: any) => {
            mergeState({ [key]: value })
            replaceToUrl(key, value)
        }
    }), [mergeState, mergePushToUrl, pushToUrl, removePushFromUrl, removeStateKeys, replaceToUrl])
}