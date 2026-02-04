import { useEffect, useRef, useState } from 'react';
import { usePendingEffect } from './usePendingEffect';
import useSubscription from './mqtt/useSubscription';
import { PendingResult } from 'protobase';

export const useRemoteStateList = (
  items,
  fetch,
  topic,
  model,
  quickRefresh = false,
  disableNotifications?,
  maxItems = 0
) => {
  const [dataState, setDataState] = useState<PendingResult | undefined>(items);
  const lastSeenId = useRef<number>(0);

  // Fetch inicial/pending: idéntico
  usePendingEffect((s) => fetch(s), setDataState, dataState);

  if (disableNotifications) {
    return [dataState, setDataState] as const;
  }

  // Suscripción estilo useLog: solo onMessage, sin usar `messages`
  const sub = useSubscription(topic);

  useEffect(() => {
    if (!sub?.onMessage) return;

    const unsubscribe = sub.onMessage((message) => {
      try {
        // mismo parseo que tu versión
        const mqttDataString =
          typeof message.message === 'string'
            ? message.message
            : JSON.stringify(message.message);
        const mqttData = JSON.parse(mqttDataString);

        // evita reprocesar eventos
        if (message.id <= lastSeenId.current) return;
        lastSeenId.current = message.id;

        // misma extracción de acción: const [,,action] = topic.split('/')
        const [, , action] = (message.topic || '').split('/');

        if (quickRefresh) {
          // MISMO patch local que tu hook original
          setDataState((prev) => {
            const currentData = prev?.data || {};
            const list = currentData.items || [];

            switch (action) {
              case 'create': {
                let nextItems = [mqttData, ...list];

                if (typeof maxItems === 'number' && maxItems > 0 && nextItems.length > maxItems) {
                  nextItems = nextItems.slice(0, maxItems);
                }

                return {
                  ...prev,
                  data: { ...currentData, items: nextItems },
                };
              }
              case 'delete': {
                const newItemsDelete = list.filter(
                  (it) =>
                    model.load(it).getId() !== model.load(mqttData).getId()
                );
                return {
                  ...prev,
                  data: { ...currentData, items: newItemsDelete },
                };
              }
              case 'update': {
                const newItemsUpdate = list.map((it) =>
                  model.load(it).getId() === model.load(mqttData).getId()
                    ? mqttData
                    : it
                );
                return {
                  ...prev,
                  data: { ...currentData, items: newItemsUpdate },
                };
              }
              default:
                return prev;
            }
          });
        } else {
          // MISMO comportamiento: refetch en cambios
          fetch(setDataState);
        }
      } catch (e) {
        // si algún payload no es JSON válido, mantenemos el comportamiento silencioso
        // (tu versión asume JSON.parse; si quieres tolerancia, se puede envolver)
        // console.error('MQTT parse error:', e);
      }
    });

    return () => {
      unsubscribe?.();
    };
  }, [sub?.onMessage, fetch, model, quickRefresh]);

  return [dataState, setDataState] as const;
};