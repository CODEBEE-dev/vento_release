/**
 * useUICommands - Listens for UI commands from backend via MQTT and forwards to PageBus
 *
 * Commands:
 * - ui/commands/open-tab: Opens a board as a new tab
 */

import { useEffect } from 'react';
import { useSubscription } from './mqtt';
import { sendToPageBus } from './PageBus';

export function useUICommands() {
    const { onMessage } = useSubscription('notifications/event/create/ui/commands/#');

    useEffect(() => {
        const cleanup = onMessage((msg) => {
            try {
                const data = typeof msg.message === 'string' ? JSON.parse(msg.message) : msg.message;
                const payload = data?.payload;

                if (!payload) return;

                // Extract command type from topic: notifications/event/create/ui/commands/{command}
                const topic = msg.topic;
                const commandMatch = topic.match(/ui\/commands\/([^/]+)/);
                const command = commandMatch?.[1];

                if (command === 'open-tab' && payload.name) {
                    sendToPageBus({
                        type: 'open-tab',
                        name: payload.name,
                        tabType: payload.tabType || 'board'
                    });
                }
            } catch (e) {
                console.error('[useUICommands] Error processing message:', e);
            }
        });

        return cleanup;
    }, [onMessage]);
}

export default useUICommands;
