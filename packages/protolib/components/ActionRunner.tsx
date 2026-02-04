import { YStack } from '@my/ui';
import React, { useEffect } from 'react';
import { HTMLView } from "@extensions/services/widgets";
import { defaultCardHtmlTemplates } from './board/defaultCardTemplates';

export const ActionRunner = ({ id = null, setData = (data, id) => { }, name, data, displayResponse, value = undefined, html, caption = "Run", description = "", actionParams = {}, onRun, icon, color = 'var(--color7)', ...props }) => {
    useEffect(() => {
        if (!window['onRunListeners']) window['onRunListeners'] = {}
        window['onRunListeners'][name] = onRun
        if (!window['onChangeCardData']) window['onChangeCardData'] = {}
        window['onChangeCardData'][name] = (data) => setData(data, name)
    }, [name])

    // Determine which HTML to use: provided html, or default based on card type
    const effectiveHtml = html?.length > 0
        ? html
        : defaultCardHtmlTemplates[data?.type] || defaultCardHtmlTemplates.action;

    const cardData = {
        ...props,
        ...data,
        icon,
        name,
        params: actionParams,
        color,
        displayResponse,
        value
    };

    return (
        <YStack h="100%">
            <HTMLView
                style={{ width: "100%", height: "100%" }}
                html={effectiveHtml}
                data={cardData}
                setData={((newData: any) => { setData(newData, id) }) as any}
            />
        </YStack>
    );
};
