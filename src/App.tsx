import { createContext, useCallback, useEffect, useReducer, useState } from 'react'
import './index.css'
import React from 'react';

type AppProps = {
        debug: boolean,
    }

export const AppStateContext = createContext<any>(null);
export const AppSendMessageContext = createContext<any>(null);
export const AppExitContext = createContext<any>(null);

export const ModalCommanderContext = createContext<any>(null);
window.ModalCommanderContext = ModalCommanderContext;

class AppErrorBoundary extends React.Component<any, any> {
    constructor(props: any) {
        super(props);
        this.state = { error: null };
    }

    static getDerivedStateFromError(error: any) {
        return { error };
    }

    componentDidCatch(error: any, errorInfo: any) {
        this.props.sendMessage({ command: 'error', error: error, errorInfo: errorInfo })
    }

    render() {
        if (this.state.error) {
            return <div>Something went wrong: {this.state.error.toString()}</div>;
        }

        return this.props.children;
    }
}

function App({ debug }: AppProps) {
    const [appState, dispatchAppState] = useReducer(
        (state: any, action: any) => {
            if (action.type === 'resetState') {
                return { 
                    rootComponent: state.rootComponent, 
                    rootProps: state.rootProps, 
                    cacheBusterKey: Math.random(),
                    componentCache: {}
                }
            } else if (action.type === 'updateState') {
                return { ...state, ...action.data }
            } else if (action.type === 'loadConfig') {
                return { 
                    rootComponent: action.data.rootComponent, 
                    rootProps: action.data.rootProps, 
                    cacheBusterKey: Math.random(),
                    componentCache: {
                        ...state.componentCache,
                        [action.data.rootComponent.name]: action.data.rootComponent
                    }
                }
            }
        }, 
        { 
            rootComponent: null, 
            rootProps: null, 
            cacheBusterKey: Math.random(), 
            componentCache: {} 
        },
    );

    const [lastMessage, setLastMessage] = useState<any>(null);

    const handleMessage = useCallback((event: any, message: any) => {
        if (message.type === 'setRootCommand') {
            if (appState.componentCache[message.data.name]) {
                dispatchAppState({
                    type: 'loadConfig',
                    data: {
                        rootComponent: appState.componentCache[message.data.name],
                        rootProps: message.data.props
                    }
                });
            } else {
                import(`mc://commands/${message.data.package}`).then((module: any) => {
                    const rootComponent = module.components[message.data.name];
                    dispatchAppState({
                        type: 'loadConfig',
                        data: {
                            rootComponent: rootComponent,
                            rootProps: message.data.props
                        }
                    });
                });
            }
        } else if (message.type === 'resetState') {
            dispatchAppState({ type: 'resetState' });
        } else {
            dispatchAppState({ type: 'updateState', data: { [message.type]: message } });
        }
        setLastMessage(message)
    }, []);

    useEffect(() => {
        window.ipcRenderer.on('main-message', handleMessage);

        return () => {
            window.ipcRenderer.off('main-message', handleMessage)
        }
    }, []);

    const sendMessage = useCallback((message: any) => {
        window.ipcRenderer.send('renderer-message', message);
    }, []);

    const handleExit = useCallback(() => {
        window.ipcRenderer.send('renderer-message', { command: 'hide' });
    }, []);

    const sendInvoke = useCallback((message: any) => {
        return window.ipcRenderer.invoke('renderer-invoke', message);
    }, []);

    return (
        <AppErrorBoundary sendMessage={sendMessage}>
            <ModalCommanderContext.Provider value={{ appState, sendMessage, handleExit, sendInvoke }}>
                {
                    appState.rootComponent ? (

                        <div 
                            key={appState.cacheBusterKey} 
                            className="font-sans bg-gray-100 shadow-xl flex flex-row flex-nowrap justify-start space-x-2.5 items-stretch border border-gray-200 rounded-lg p-2.5 h-dvh"
                        >
                            <appState.rootComponent index={0} {...appState.rootProps} />
                        </div>
                    ) : (
                        <div data-testid="app-loading">Loading...</div>
                    )
                }
            </ModalCommanderContext.Provider>
        </AppErrorBoundary>
    )
}

export default App
