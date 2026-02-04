import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBoardVersion, useBusy, useLoading, useVersions, useBoardVersionId } from '../store/boardStore';
import { atom, useAtom } from 'jotai'

/* ---------- API calls (cliente) ---------- */

export const listVersions = async (boardId: string): Promise<number[]> => {
  const r = await fetch(`/api/core/v1/boards/${boardId}/history`, { credentials: 'include' });
  if (!r.ok) throw new Error('Failed to list versions');
  return r.json();
};

export const latestVersion = async (boardId: string): Promise<number> => {
  const versions = await listVersions(boardId);
  return versions?.length ?? 0;   
};

export const restoreVersion = async (
  boardId: string,
  version: any
): Promise<{ ok: boolean; restored: { boardId: string; version: any } }> => {
  console.log("restoreVersion**************** - restoring version:", version);
  const r = await fetch(`/api/core/v1/boards/${boardId}/versions/${version}/restore`, {
    method: 'GET',
    credentials: 'include',
  });
  if (!r.ok) throw new Error('Failed to restore version');
  return r.json();
};

export const getCurrentVersion = async (boardId: string): Promise<number | null> => {
  const r = await fetch(`/api/core/v1/boards/${boardId}/version/current`, { credentials: 'include' });
  if (!r.ok) return null;
  const data = await r.json();
  const v = Number(data?.version);
  return Number.isFinite(v) ? v : null;
};

export const setVersionMeta = async (boardId: string, version: number, data: { comment?: string; tag?: string }) => {
  const r = await fetch(`/api/core/v1/boards/${boardId}/versions/${version}/meta`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data)
  });
  if (!r.ok) throw new Error('Failed to set version meta');
  return r.json();
};

export function useBoardVersions(boardId?: string) {
  const [versions, setVersions] = useVersions();
  const [current, setCurrent] = useBoardVersion();
  const [, setBoardVersionId] = useBoardVersionId();
  const [loading, setLoading] = useLoading();
  const [busy, setBusy] = useBusy();

  const canUndo = current > 1;
  const canRedo = current >= 1 && current < versions.length;

  const refresh = useCallback(async (includeVersion?: boolean) => {
    if (!boardId) return;
    setLoading(true);
    try {
      const [list, curr] = await Promise.all([
        listVersions(boardId),
        getCurrentVersion(boardId),
      ]);

      setVersions(list);
      if(includeVersion) {
        setCurrent(curr || null);
      }
      
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  const goToVersion = useCallback(
    async (target: number) => {
      if (!boardId || busy) return;
      setBusy(true);
      try {
        const response = await restoreVersion(boardId, target);
        setCurrent(response?.restored?.version ?? target);
        setBoardVersionId(v => v + 1) //to force reloading board
        // document.location.reload();
      } finally {
        setBusy(false);
      }
    },
    [boardId, versions]
  );

  const undo = useCallback(async () => {
    if (!canUndo) return;
    const target = current - 1;
    await goToVersion(target);
  }, [canUndo, current, versions, goToVersion]);

  const redo = useCallback(async () => {
    if (!canRedo) return;
    const target = current + 1;
    await goToVersion(target);
  }, [canRedo, current, versions, goToVersion]);


  return {
    versions,         // lista ordenada
    current,          // versión actual (del JSON)
    canUndo, canRedo,
    loading,
    refresh,          // fuerza relectura (por si hay cambios externos)
    undo, redo,
    goToVersion,      // por si quieres saltar a una versión concreta desde UI
  };
}
