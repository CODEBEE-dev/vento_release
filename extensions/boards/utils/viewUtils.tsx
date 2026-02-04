import { atom } from 'jotai'
import { API } from 'protobase'

export const itemsAtom = atom(null as any); //(board) => atomWithDefault(() => board.cards && board.cards.length ? board.cards : []);
export const automationInfoAtom = atom(null as any);
export const uiCodeInfoAtom = atom(null as any);

export const reloadBoard = async (boardId, setItems, setBoardVersion, setAutomationInfo, setUICodeInfo) => {
  const dataData = await API.get(`/api/core/v1/boards/${boardId}`)
  const automationInfo = await API.get(`/api/core/v1/boards/${boardId}/automation`)
  const UICodeInfo = await API.get(`/api/core/v1/boards/${boardId}/uicode`)
  setAutomationInfo(automationInfo.data)
  setUICodeInfo(UICodeInfo.data)
  if (dataData.status == 'loaded') {
    let newItems = (dataData.data?.cards || []).filter(card => card)
    if (!newItems || newItems.length == 0) newItems = []
    setItems(newItems)
    setBoardVersion(dataData.data.version || 1)
  }
}