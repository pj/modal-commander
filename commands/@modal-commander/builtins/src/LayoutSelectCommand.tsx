import { useCallback, useEffect, useContext, useState } from "react"
import { CommandWrapper, DefaultCommandProps } from "./CommandWrapper"
import { FrontendState } from "./WindowManagementTypes"
import { RootLayout } from "./RootLayout"

export type LayoutCommandProps = DefaultCommandProps

export function LayoutSelectCommand(props: LayoutCommandProps) {
    const { sendInvoke, sendMessage } = useContext(window.ModalCommanderContext)
    const [windowManagementState, setWindowManagementState] = useState<FrontendState | undefined>(undefined)

    const getWindowManagementState = useCallback(() => {
        sendInvoke({ 
            command: '@modal-commander/builtins#LayoutSelectCommand', 
            type: 'getState' 
        }).then(
            (state: FrontendState) => {
                setWindowManagementState(state)
            }
        );
    }, [sendInvoke])

    const updateWindowManagementState = useCallback((state: FrontendState) => {
        setWindowManagementState(state)
        sendInvoke({ command: '@modal-commander/builtins#LayoutSelectCommand', type: 'updateState', state: state })
    }, [setWindowManagementState])

    const handleVisibilityChange = () => {
        if (!document.hidden) {
            getWindowManagementState()
        }
    }

    useEffect(() => {
        getWindowManagementState()
        window.addEventListener("visibilitychange", handleVisibilityChange);
        const interval = setInterval(() => {
            getWindowManagementState();
        }, 10000);
        return () => {
            window.removeEventListener("visibilitychange", handleVisibilityChange);
            clearInterval(interval);
        }
    }, []);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        for (const layout of windowManagementState?.layouts || []) {
            if (layout.quickKey === event.key) {
                sendInvoke({ 
                    command: '@modal-commander/builtins#LayoutSelectCommand', 
                    type: 'setLayout', 
                    layout: layout 
                }).then(
                    () => sendMessage({ command: "hide" })
                );

                return;
            }
        }
    }
    return (
        <CommandWrapper
            {...props}
            keyHandler={handleKeyDown}
            testIdPrefix="layout-select"
            headerText="Layout Select"
            inner={
                windowManagementState ? (
                    <div className="flex flex-row divide-x *:px-2 first:*:pt-0 last:*:pb-0">
                        {
                            windowManagementState.layouts.map((layout) => (
                                <RootLayout
                                    layout={layout}
                                    monitors={windowManagementState.monitors}
                                />
                            ))
                        }
                    </div>
                ) : null
            }
        />
    );
}
