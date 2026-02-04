import { API, getPendingResult, set } from 'protobase'
import { useEffect, useState } from 'react'
import { usePendingEffect } from 'protolib/lib/usePendingEffect'
import { ActionRunner } from 'protolib/components/ActionRunner';

export const CardView = ({ board, card, mode = 'view' }: any) => {
    const [cardData, setCardData] = useState<any>(getPendingResult('pending'))
    usePendingEffect((s) => { API.get({ url: `/api/core/v1/boards/${board}/cards/${card}/info` + (mode == 'run' ? '/run' : '') }, s) }, setCardData, cardData)
    useEffect(() => {
        window['executeAction'] = async (card, params) => {
            return await window['onRunListeners'][card](card, params);
        };

        window['executeActionForm'] = async (event, card) => {
            //This allows to call the action from <ActtionRunner />
            event.preventDefault();
            const formData = new FormData(event.target);
            const params = Object.fromEntries(formData['entries']());

            const cleanedParams = {};
            for (const key in params) {
                if (params[key] || params[key] === "0") {
                    cleanedParams[key] = params[key];
                }
            }

            return await window['onRunListeners'][card](card, cleanedParams);
        };

    }, [])

    if (cardData.status === 'pending') return <h1>Loading...</h1>
    if (cardData.status === 'error') return <h1>Error loading card</h1>


    return (
        <ActionRunner
            setData={(data) => {
                console.log('set data from action runner')
            }}
            id={cardData?.data?.key}
            data={cardData?.data}
            displayResponse={cardData?.data?.displayResponse}
            name={cardData?.data?.name}
            description="Run action"
            actionParams={cardData?.data?.params}
            onRun={async (card, params, z) => {
                const paramsStr = Object.keys(params).map(k => k + '=' + params[k]).join('&');
                //console.log('url: ', action.url+'?token='+token+'&'+paramsStr)
                const response = await API.get(`/api/core/v1/boards/${board}/cards/${card}/run` + '?' + paramsStr);
                if (response.isLoaded) {
                    console.log('setting cardd data to: ', {
                        ...cardData,
                        data: {
                            ...cardData.data,
                            value: response.data
                        }
                    })
                    setCardData({
                        ...cardData,
                        data: {
                            ...cardData.data,
                            value: response.data
                        }
                    })
                }
            }}
            icon={cardData?.data?.icon}
            color={cardData?.data?.color}
            html={cardData?.data?.html}
            value={cardData?.data?.value}
        />
    )
}