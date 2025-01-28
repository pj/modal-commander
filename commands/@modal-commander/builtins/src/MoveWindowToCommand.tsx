import { useCallback, useContext, useEffect, useState } from "react"
import { CommandWrapper, DefaultCommandProps } from "./CommandWrapper"
import { LayoutNode, RenderOptions } from "./RootLayout"
import { Application, Bounds, FrontendState, Layout, Monitor, SCREEN_PRIMARY, ScreenConfig } from "./WindowManagementTypes"
import { Key } from "./Key"
import log from "electron-log"
export type MoveSource = number | "app" | "window"

export type MoveWindowToCommandProps = DefaultCommandProps & {
    source: MoveSource
}

function processLayout(
    layout: Layout<RenderOptions>,
    source: MoveSource,
    currentApplication: Application,
    index: number
): Layout<RenderOptions> {
    const nextLayout: Layout<RenderOptions> = {
        ...layout
    }
    if (nextLayout.type === "columns") {
        let columns: Layout<RenderOptions>[] = [];
        for (const column of nextLayout.columns) {
            columns.push(processLayout(column, source, currentApplication, index++));
        }
        nextLayout.columns = columns;
        return nextLayout;
    } else if (nextLayout.type === "rows") {
        let rows: Layout<RenderOptions>[] = [];
        for (const row of nextLayout.rows) {
            rows.push(processLayout(row, source, currentApplication, index++));
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
                index: index,
                selected: selected,
                render: (
                    <>
                        <Key text={index.toString()}/> 
                        {render}
                    </>
                )
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
                index: index,
                selected: selected,
                render: (
                    <>
                        <Key text={index.toString()}/> 
                        {render}
                    </>
                )
            }
        }
        return nextLayout;
    }
    else if (nextLayout.type === "empty") {
        nextLayout.attachment = {
            index: index,
            selected: false,
            render: (
                <>
                    <Key text={index.toString()}/> 
                    Empty
                </>
            )
        }
        return nextLayout;
    }
    return nextLayout;
}

function getDestination(layout: Layout<RenderOptions>, index: string): number[] | null {
    if (layout.type === "columns") {
        for (let i = 0; i < layout.columns.length; i++) {
            const column = layout.columns[i];
            const destination = getDestination(column, index);
            if (destination) {
                return [i, ...destination];
            }
        }
    } else if (layout.type === "rows") {
        for (let i = 0; i < layout.rows.length; i++) {
            const row = layout.rows[i];
            const destination = getDestination(row, index);
            if (destination) {
                return [i, ...destination];
            }
        }
    } else if (layout.type === "stack") {
        if (layout.attachment?.index.toString() === index) {
            return [];
        }
    } else if (layout.type === "pinned") {
        if (layout.attachment?.index.toString() === index) {
            return [];
        }
    } else if (layout.type === "empty") {
        if (layout.attachment?.index.toString() === index) {
            return [];
        }
    }

    return null;
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

    let bounds: Bounds | null = null
    let layout: Layout<RenderOptions> | null = null
    const monitor = windowManagementState?.monitors[0]
    let currentApplication: Application | null = null
    let headerText = "Move Window To"
    if (monitor) {
        bounds = monitor.bounds
        if (monitor.main && windowManagementState?.currentLayout?.[SCREEN_PRIMARY]) {
            layout = windowManagementState?.currentLayout?.[SCREEN_PRIMARY]
        } else {
            layout = windowManagementState?.currentLayout?.[monitor.name] || null
        }
        currentApplication = windowManagementState?.currentApplication || null;
        if (layout && currentApplication) {
            layout = processLayout(layout, props.source, currentApplication, 0);
            if (props.source === "app") {
                headerText = `Move ${currentApplication?.name} To`
            } else if (props.source === "window") {
                headerText = `Move ${currentApplication?.focusedWindow?.title} To`
            } else {
                const window = windowManagementState?.windows.find(window => window.id === props.source);
                if (window) {
                    headerText = `Move ${window.title} To`
                }
            }
        }
    }
    console.log("--------------------------------")
    console.log("windowManagementState", windowManagementState)
    console.log("monitor", monitor)
    console.log("layout", layout)
    console.log("currentApplication", currentApplication)
    console.log("bounds", bounds)

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (!layout) {
            log.warn("No layout found");
            return;
        }
        const index = event.key
        const destination = getDestination(layout, index);
        if (destination) {
            sendInvoke({
                command: '@modal-commander/builtins#MoveWindowToCommand',
                type: 'moveWindowTo',
                monitor: monitor?.name,
                destination: destination,
                source: props.source
            }).then(
                () => sendMessage({ command: "hide" })
            );
        }

        return;
    }


    return (
        <CommandWrapper
            {...props}
            keyHandler={handleKeyDown}
            testIdPrefix="move-window-to"
            headerText={headerText}
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
