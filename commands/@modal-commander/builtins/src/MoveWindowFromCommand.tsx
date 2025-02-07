import { useCallback, useContext, useEffect, useState } from "react"
import { CommandWrapper, DefaultCommandProps, useMainState } from "./CommandWrapper"
import { LayoutNode, RenderOptions, RenderScreenSet } from "./RootLayout"
import { Application, FrontendState, Layout, Monitor, ScreenConfig } from "./WindowManagementTypes"
import { Key } from "./Key"
import log from "electron-log"
import { MoveSource } from "./MoveWindowToCommand"

type LocationToMove = {
    applicationName: string | null;
    windows: number[] | null;
    direction: number[];
}

export type MoveWindowFromCommandProps = DefaultCommandProps & { source: MoveSource | null };

function processLayout(
    layout: Layout<RenderOptions>,
    source: LocationToMove,
    currentApplication: Application,
    counter: { count: number },
    setSelectedFromIndex: (index: number) => void
): Layout<RenderOptions> {
    const nextLayout: Layout<RenderOptions> = {
        ...layout
    }
    if (nextLayout.type === "columns") {
        let columns: Layout<RenderOptions>[] = [];
        for (const column of nextLayout.columns) {
            columns.push(processLayout(column, source, currentApplication, counter, setSelectedFromIndex));
        }
        const index = counter.count;
        nextLayout.attachment = {
            directionLeader: (
                <div onClick={() => {
                    setSelectedFromIndex(index);
                }}>
                    <Key text={index.toString()} />
                </div>
            )
        }
        counter.count++;
        nextLayout.columns = columns;
        return nextLayout;
    } else if (nextLayout.type === "rows") {
        let rows: Layout<RenderOptions>[] = [];
        for (const row of nextLayout.rows) {
            rows.push(processLayout(row, source, currentApplication, counter, setSelectedFromIndex));
        }
        const index = counter.count;
        nextLayout.attachment = {
            directionLeader: (
                <div onClick={() => {
                    setSelectedFromIndex(index);
                }}>
                    <Key text={index.toString()} />
                </div>
            )
        }
        counter.count++;
        nextLayout.rows = rows;
        return nextLayout;
    } else if (nextLayout.type === "stack") {
        if (nextLayout.computed) {
            let selected: boolean = false;
            let render: React.ReactNode | null = null;
            for (const window of nextLayout.windows) {
                if (window.application == source.applicationName) {
                    selected = true;
                    break;
                }
                if (window.title )
                    for (const windowId of source.windows || []) {
                        if (window.id === windowId) {
                            selected = true;
                        break;
                    }
                }
            }
            nextLayout.attachment = {
                index: counter.count,
                selected: selected,
                render: (
                    <>
                        <Key text={counter.count.toString()} />
                        {render}
                    </>
                )
            }
            counter.count++;
        }
        return nextLayout;
    } else if (nextLayout.type === "pinned") {
        if (nextLayout.computed) {
            let index = counter.count;
            let selected: boolean = false;
            let render: React.ReactNode | null = null;
            if (nextLayout.application == source.applicationName) {}
            nextLayout.attachment = {
                index: counter.count,
                selected: selected,
                render: (
                    <>
                        <Key text={counter.count.toString()} />
                        {render}
                    </>
                ),
                onClick: () => {
                    setSelectedFromIndex(index);
                }
            }
            counter.count++;
        }
        return nextLayout;
    }
    else if (nextLayout.type === "empty") {
        let index = counter.count;
        nextLayout.attachment = {
            index: counter.count,
            selected: false,
            render: (
                <>
                    <Key text={counter.count.toString()} />
                    Empty
                </>
            ),
            onClick: () => {
                console.log("Empty layout clicked");
                setSelectedFromIndex(index);
            }
        }
        counter.count++;
        return nextLayout;
    }
    return nextLayout;
}

function getRenderDetails(state: FrontendState | undefined, source: LocationToMove | null, setSelectedFromIndex: (index: number) => void): [Monitor[], ScreenConfig] | null {
    if (!state) {
        return null;
    }

    if (!source) {
        return null;
    }

    if (state.currentLayout) {
        const currentApplication = state.currentApplication;
        if (currentApplication) {
            const nextScreenConfig: ScreenConfig = {};

            const counter = { count: 0 };

            for (const [monitorName, layout] of Object.entries(state.currentLayout)) {
                nextScreenConfig[monitorName] = processLayout(
                    layout,
                    source,
                    currentApplication,
                    counter,
                    setSelectedFromIndex
                );
            }
            return [state.monitors, nextScreenConfig];
        }
    }
    return null;
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

    return [];
}

function getWindowTitle(windowManagementState: FrontendState | undefined, source: LocationToMove | null): string {
    const defaultTitle = "Move From"
    if (!windowManagementState) {
        return defaultTitle;
    }

    if (!windowManagementState.currentApplication) {
        return defaultTitle;
    }

    if (!source) {
        return defaultTitle;
    }

    // Just show applicaiton name if no windows are selected
    if (!source.windows) {
        return `Move ${source.applicationName} From`
    }

    // Show window title if a single window is selected
    if (source.windows.length === 1) {
        return `Move ${source.windows[0]} From`
    } else {
        return `Move ${source.windows.length} ${source.applicationName} Windows From`
    }
}

export function MoveWindowFromCommand(props: MoveWindowFromCommandProps) {
    const { sendInvoke, sendMessage } = useContext(window.ModalCommanderContext)
    const windowManagementState = useMainState<FrontendState>('@modal-commander/builtins#MoveWindowFromCommand')

    const [selectedSource, setSelectedSource] = useState<LocationToMove | null>(null);

    const [initialApplication, setInitialApplication] = useState<string | null>(null);

    // Set AppToMove based on source and currentApplication
    useEffect(() => {
        if (initialApplication === null) {
            if (props.source === "app") {
                if (windowManagementState?.currentApplication && windowManagementState?.currentApplication?.name) {
                    setSelectedSource({
                        applicationName: windowManagementState?.currentApplication?.name || "",
                        windows: null
                    });
                    setInitialApplication(windowManagementState?.currentApplication?.name || "");
                }
            } else if (props.source === "window") {
                if (windowManagementState?.currentApplication && windowManagementState?.currentApplication?.focusedWindow) {
                    setSelectedSource({
                        applicationName: windowManagementState?.currentApplication?.focusedWindow?.title || "",
                        windows: [windowManagementState?.currentApplication?.focusedWindow?.id]
                    });
                    setInitialApplication(windowManagementState?.currentApplication?.focusedWindow?.title || "");
                }
            } else if (props.source !== null) {
                const window = windowManagementState?.windows.find(window => window.id === props.source);
                if (window) {
                    setSelectedSource({
                        applicationName: window.application,
                        windows: [window.id]
                    });
                    setInitialApplication(window.application);
                }
            }
        }
    }, [props.source, windowManagementState?.currentApplication]);

    // console.log("--------------------------------")
    // console.log("windowManagementState", windowManagementState)
    // console.log("monitor", monitor)
    // console.log("layout", layout)
    // console.log("currentApplication", currentApplication)
    // console.log("bounds", bounds)

    const headerText = getWindowTitle(windowManagementState, selectedSource);

    const setSelectedFromIndex = (index: number) => {
        if (selectedSource) {
            selectedSource.windows = [index];
        }
    }

    const renderDetails = getRenderDetails(windowManagementState, selectedSource, setSelectedFromIndex);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (!renderDetails) {
            log.warn("No layout found");
            return;
        }
        const index = event.key
        let destination: number[] | null = null;
        let destinationMonitor: string | null = null;
        for (const [monitorName, layout] of Object.entries(renderDetails[1])) {
            destination = getDestination(layout, index);
            if (destination) {
                destinationMonitor = monitorName;
                break;
            }
        }
        if (destination) {
            setSelectedFromIndex(destination[0]);
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
                renderDetails ? (
                    <div className="card-body">
                        <RenderScreenSet
                            monitors={renderDetails[0]}
                            screenSet={renderDetails[1]}
                        />
                    </div>
                ) : null
            }
        />
    );
}
