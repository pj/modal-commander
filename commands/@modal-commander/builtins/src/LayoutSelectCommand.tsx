import { useCallback, useEffect, useContext, useState } from "react"
import { CommandWrapper, DefaultCommandProps } from "./CommandWrapper"
import { FrontendState } from "./WindowManagementTypes"
import { RenderLayout } from "./RootLayout"

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
                    quickKey: layout.quickKey
                });
                sendMessage({ command: "hide" });
                return;
            }
        }
    }
    const layouts = [];
    if (windowManagementState) {
        for (const layout of windowManagementState?.layouts || []) {
            layouts.push(<RenderLayout key={layout.name} layout={layout} monitors={windowManagementState.monitors} />)
        }
    }
    console.log(windowManagementState?.layouts);
    console.log(layouts);
    return (
        <CommandWrapper
            {...props}
            keyHandler={handleKeyDown}
            testIdPrefix="layout-select"
            headerText="Layout Select"
            inner={
                windowManagementState ? (
                    <div className="card-body flex flex-row divide-x *:p-2 first:*:pt-0 last:*:pb-0">
                        {layouts}
                    </div>
                ) : null
            }
        />
    );
}
