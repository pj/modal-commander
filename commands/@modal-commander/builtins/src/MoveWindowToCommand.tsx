import { useCallback, useContext, useEffect, useState } from "react"
import { CommandWrapper, DefaultCommandProps } from "./CommandWrapper"
import { LayoutNode, RenderOptions } from "./RootLayout"
import { Application, Bounds, FrontendState, Layout, Monitor, ScreenConfig } from "./WindowManagementTypes"

export type MoveSource = number | "app" | "window"

export type MoveWindowToCommandProps = DefaultCommandProps & {
    source: MoveSource
}

function processLayout(
    layout: Layout<RenderOptions>,
    source: MoveSource,
    currentApplication: Application
): Layout<RenderOptions> {
    const nextLayout: Layout<RenderOptions> = {
        ...layout
    }
    if (nextLayout.type === "columns") {
        let columns: Layout<RenderOptions>[] = [];
        for (const column of nextLayout.columns) {
            columns.push(processLayout(column, source, currentApplication));
        }
        nextLayout.columns = columns;
        return nextLayout;
    } else if (nextLayout.type === "rows") {
        let rows: Layout<RenderOptions>[] = [];
        for (const row of nextLayout.rows) {
            rows.push(processLayout(row, source, currentApplication));
        }
        nextLayout.rows = rows;
        return nextLayout;
    } else if (nextLayout.type === "stack") {
        if (nextLayout.computed) {
            let selected: boolean = false;
            let render: React.ReactNode | null = null;
            if (source === "window") {
                const selectedWindow = nextLayout.computed.find(
                    window => window.id === currentApplication?.focusedWindow?.id
                );
                if (selectedWindow) {
                    selected = true;
                    render = selectedWindow.title
                }
            } else if (source === "app") {
                const currentApplicationWindow = nextLayout.computed.find(
                    window => window.application === currentApplication?.name
                );
                if (currentApplicationWindow) {
                    selected = true;
                    render = currentApplicationWindow.title
                }
            } else {
                const selectedWindow = nextLayout.computed.find(
                    window => window.id === source
                );
                if (selectedWindow) {
                    selected = true;
                    render = selectedWindow.title
                }
            }
            nextLayout.attachment = {
                selected: selected,
                render: render
            }
        }
        return nextLayout;
    } else if (nextLayout.type === "pinned") {
        if (nextLayout.computed) {
            let selected: boolean = false;
            let render: React.ReactNode | null = null;
            if (source === "window") {
                const selectedWindow = nextLayout.computed.find(
                    window => window.id === currentApplication?.focusedWindow?.id
                );
                if (selectedWindow) {
                    selected = true;
                }
                render = nextLayout.title
            } else if (source === "app") {
                if (currentApplication?.name === nextLayout.application) {
                    selected = true;
                }
                render = nextLayout.application
            } else {
                const selectedWindow = nextLayout.computed.find(
                    window => window.id === source
                );
                if (selectedWindow) {
                    selected = true;
                }
                render = nextLayout.title
            }
            nextLayout.attachment = {
                selected: selected,
                render: render
            }
        }
        return nextLayout;
    }
    else if (nextLayout.type === "empty") {
        nextLayout.attachment = {
            selected: false,
            render: null
        }
        return nextLayout;
    }
    return nextLayout;
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

    let bounds: Bounds | null = null
    let layout: Layout<RenderOptions> | null = null
    const monitor = windowManagementState?.monitors[0]
    let currentApplication: Application | null = null
    if (monitor) {
        bounds = monitor.bounds
        layout = windowManagementState?.currentLayout?.[monitor.name] || null;
        currentApplication = windowManagementState?.currentApplication || null;
        if (layout && currentApplication) {
            layout = processLayout(layout, props.source, currentApplication);
            console.log("layout", layout)
        }
    }

    return (
        <CommandWrapper
            {...props}
            keyHandler={handleKeyDown}
            testIdPrefix="move-window-to"
            headerText="Move Window To"
            inner={
                layout && bounds && currentApplication ? (
                    <div className="p-1 rounded-sm bg-black relative" style={{
                        width: bounds.width * 0.2,
                        height: bounds.height * 0.2
                    }}>
                        <LayoutNode
                            layout={layout}
                            frame={bounds}
                            margin=""
                        />
                    </div>
                ) : null
            }
        />
    );
}
