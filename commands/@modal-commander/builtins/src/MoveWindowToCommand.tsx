import { useCallback,useEffect,  useContext, useState } from "react"
import { CommandWrapper, DefaultCommandProps } from "./CommandWrapper"
import { FrontendState, WindowManagerLayout } from "./WindowManagementTypes"
import log from "electron-log"

export type MoveWindowToCommandProps = DefaultCommandProps & {
    source: number | "current" | "app"
}

export function MoveWindowToCommand(props: MoveWindowToCommandProps) {
    const { sendInvoke, sendMessage } = useContext(window.ModalCommanderContext)
    const [windowManagementState, setWindowManagementState] = useState<FrontendState | undefined>(undefined)

    const getWindowManagementState = useCallback(() => {
        sendInvoke({ 
            command: '@modal-commander/builtins#MoveWindowToCommand', 
            type: 'getState' 
        }).then(
            (state: FrontendState) => {
                setWindowManagementState(state)
            }
        );
    }, [sendInvoke])

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
                    command: '@modal-commander/builtins#MoveWindowToCommand', 
                    type: 'moveWindowTo', 
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
            testIdPrefix="move-window-to"
            headerText="Move Window To"
            inner={
                windowManagementState ? (
                    <div className="flex flex-row divide-x *:px-2 first:*:pt-0 last:*:pb-0">
                        {
                            windowManagementState.layouts.map((layout: WindowManagerLayout) => (
                                <div key={layout.quickKey}>{layout.quickKey}</div>
                            ))
                        }
                    </div>
                ) : null
            }
        />
    );
}
