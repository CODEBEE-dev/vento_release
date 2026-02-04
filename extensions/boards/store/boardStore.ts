import { atom, useAtom } from 'jotai'
import { useEffect, useState } from 'react'

export const highlightedCard = atom("")
export const tabVisible = atom("")

export const boardVersion = atom(1)
export const versions = atom<number[]>([]);
export const loading = atom(false);
export const busy = atom(false);
export const boardVersionId = atom(1) //internal id to track version changes. Only changes when switching versions, not when board changes
export const boardLayer = atom("base") // current active layer
export const layers = atom(["base"])

export const useBoardLayer = () => useAtom(boardLayer)
export const useLayers = () => useAtom(layers)
export const useBoardVersion = () =>  useAtom(boardVersion)
export const useBoardVersionId = () => useAtom(boardVersionId)
export const useTabVisible = () => useAtom(tabVisible)
export const useVersions = () => useAtom(versions);
export const useLoading  = () => useAtom(loading);
export const useBusy = () => useAtom(busy);
export const useHighlightedCard = () =>  useAtom(highlightedCard)

export const useIsHighlightedCard = (board, card: string) => {
    const [highlightedCard] = useHighlightedCard()
    return highlightedCard === board + '/' + card
}

export const useBoardStates = (boardName?: string) => {
    const [state, setState] = useState({})
    if (!boardName) {
        boardName = useBoardName()
    }

    useEffect(() => {
        if (window) {
            setState(window["protoStates"]?.["boards"]?.[boardName] ?? {})
        }
    }, [window["protoStates"], boardName])

    return state
}

export const useBoardActions = (boardName?: string) => {
    const [state, setState] = useState({})
    if (!boardName) {
        boardName = useBoardName()
    }

    useEffect(() => {
        if (window) {
            setState(window["protoActions"]?.["boards"]?.[boardName] ?? {})
        }
    }, [window["protoActions"], boardName])

    return state
}

export const useBoardName = () => {
    const [boardName, setBoardName] = useState(null)

    useEffect(() => {
        if (window) {
            setBoardName(window["protoBoardName"])
        }
    }, [window["protoBoardName"]])

    return boardName
}

export const executeAction = async (action, params = {}) => {
    if (!window || !window['executeAction']) {
        return
    }
    return window['executeAction'](action, params)
}