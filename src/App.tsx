import { createContext, useCallback, useEffect, useReducer, useState } from 'react'
import './index.css'
import React from 'react';

type AppProps
    // <RootCommandProps> 
    = {
        // sendMessage: (message: any) => void,
        // setMessageListener: (listener: (event: MessageEvent) => void) => void,
        // removeMessageListener: (listener: (event: MessageEvent) => void) => void,
        // RootCommand: React.ComponentType<RootCommandProps>,
        // RootCommandProps: RootCommandProps,
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
        this.props.sendMessage({ type: 'error', error: error, errorInfo: errorInfo })
    }

    render() {
        if (this.state.error) {
            return <div>Something went wrong: {this.state.error.toString()}</div>;
        }

        return this.props.children;
    }
}

function App({ debug }: AppProps) {
    const [appState, dispatchAppState] = useReducer((state: any, action: any) => {
        if (action.type === 'resetState') {
            return { rootComponent: state.rootComponent, rootProps: state.rootProps, cacheBusterKey: Math.random() }
        } else if (action.type === 'updateState') {
            return { ...state, ...action.data }
        } else if (action.type === 'loadConfig') {
            return { rootComponent: action.data.rootComponent, rootProps: action.data.rootProps, cacheBusterKey: Math.random() }
        }
    }, { rootComponent: null, rootProps: null, cacheBusterKey: Math.random() });

    const [lastMessage, setLastMessage] = useState<any>(null);

    const handleMessage = useCallback((event: any) => {
        // sendMessage({ type: 'log', log: `received message: ${JSON.stringify(event.data)}` })
        if (event.data.type === 'resetState') {
            dispatchAppState({ type: 'resetState' });
        } else {
            dispatchAppState({ type: 'updateState', data: { [event.data.type]: event.data } });
        }
        setLastMessage(event.data)
    }, []);

    useEffect(() => {
        console.log('reloading')
        window.ipcRenderer.on('message', handleMessage)
        window.ipcRenderer.invoke('page-ready').then((config: any) => {
            // console.log('config', config)
            import(`mc://commands/${config.rootCommand.package}`).then((module: any) => {
                console.log('reloaded command')
                // console.log('module', module)
                const rootComponent = module.components[config.rootCommand.name];
                dispatchAppState({
                    type: 'loadConfig',
                    data: {
                        rootComponent: rootComponent,
                        rootProps: config.rootCommand.props
                    }
                })
            })
        })

        return () => {
            window.ipcRenderer.off('message', handleMessage)
        }
    }, []);

    const sendMessage = useCallback((message: any) => {
        window.ipcRenderer.send('renderer-message', message)
    }, []);

    const handleExit = useCallback(() => {
        window.ipcRenderer.send('exit')
    }, []);

    console.log('appState', appState)

    return (
        <AppErrorBoundary sendMessage={sendMessage}>
            <ModalCommanderContext.Provider value={{ appState, sendMessage, handleExit }}>
                {
                    appState.rootComponent ? (
                        <div key={appState.cacheBusterKey} className="bg-gray-100 shadow-xl flex flex-row flex-nowrap justify-start space-x-2.5 items-stretch border border-gray-200 rounded-lg p-2.5 h-full">
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
