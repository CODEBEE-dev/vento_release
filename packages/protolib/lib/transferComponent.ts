//transfers components from nextjs to the individual react renderers inside each react card
export const TransferComponent = (component, name, metadata = {}) => {
    if (typeof window === 'undefined') {
        return;
    }

    if (!component || !name) {
        console.warn('transferComponent: component or name is missing');
        return;
    }

    //@ts-ignore
    if(!window.ProtoComponents) {
        //@ts-ignore
        window.ProtoComponents = {};
    }

    //@ts-ignore
    window.ProtoComponents[name] = {
        component,
        metadata
    };

    // Also set directly on window for viewLib.js to access before reactCard() runs
    // This is needed because viewLib.js defines SafeProvider = window.Provider at module level
    // BEFORE reactCard() copies from ProtoComponents to window
    //@ts-ignore
    window[name] = component;
}