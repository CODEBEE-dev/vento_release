import React from 'react';
import { DataView } from "./DataView";
import { MqttWrapper } from './MqttWrapper';
import { Tinted } from './Tinted';
import { ObjectViewLoader } from './ObjectViewLoader';
import { View } from '@my/ui';
import { ProtoModel } from 'protobase';

function ObjectView(props) {
    const object = props.object
    const objExists = object ? true : false
    let objModel = null
    let apiUrl = null
    if (objExists) {
        objModel = ProtoModel.getClassFromDefinition(object)
        const { name, prefix } = objModel.getApiOptions()
        apiUrl = prefix + name
    }

    return <DataView
        disableRouting={true}
        sourceUrl={apiUrl}
        numColumnsForm={1}
        name={object?.name}
        model={objModel}
        hideFilters={false}
        {...props}
    />
}

export const StorageView = ({name, ...props}) => {

    return (
        <MqttWrapper>
            <Tinted>
                <View className="no-drag">
                    <ObjectViewLoader widget={ObjectView} object={`${name}Model`} {...props} />
                </View>
            </Tinted>
        </MqttWrapper>
    );
}