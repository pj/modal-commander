import { useCallback, useContext, useEffect, useRef, useState } from "react"
import { CommandWrapper, CommandWrapperWithFocus, DefaultCommandProps, useMainState } from "./CommandWrapper"
import { LayoutNode, NodeVisitor, RenderScreenSet, VisitDetails } from "./RootLayout"
import { Application, FrontendState, Layout, Monitor, ScreenConfig } from "./WindowManagementTypes"
import { Key } from "./Key"
import log from "electron-log"
import { MoveSource, MoveWindowToCommand } from "./MoveWindowToCommand"

export type MoveWindowFromCommandProps = DefaultCommandProps & { source: MoveSource | null };

function getRenderDetails(state: FrontendState | undefined): [Monitor[], ScreenConfig] | null {
    if (!state) {
        return null;
    }

    if (state.currentLayout) {
        const currentApplication = state.currentApplication;
        if (currentApplication) {
            return [state.monitors, state.currentLayout];
        }
    }
    return null;
}

function getWindowTitle(windowManagementState: FrontendState | undefined, source: VisitDetails | null): string {
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

    return defaultTitle;

    // // Just show applicaiton name if no windows are selected
    // if (!source.windows) {
    //     return `Move ${source.applicationName} From`
    // }

    // // Show window title if a single window is selected
    // if (source.windows.length === 1) {
    //     return `Move ${source.windows[0]} From`
    // } else {
    //     return `Move ${source.windows.length} ${source.applicationName} Windows From`
    // }
}

function getVisitor(
    selectedSource: VisitDetails | null,
    setSelectedSource: (source: VisitDetails) => void,
    currentKeysRef: React.MutableRefObject<Map<string, VisitDetails>>
): NodeVisitor {
    const counter = { count: -1 };
    currentKeysRef.current = new Map();
    return {
        generateOnClick: (details: VisitDetails) => () => {
            if (details.layout.type === "stack") {
            } else if (details.layout.type === "pinned") {
            } else if (details.layout.type === "empty") {
            } else if (details.layout.type === "columns") {
            } else if (details.layout.type === "rows") {
            } else {
                throw new Error("Unknown layout type");
            }
            setSelectedSource(details);
            console.log("generateOnClick", details);
        },
        generateDirectionLeader: (details: VisitDetails) => {
            counter.count++;
            currentKeysRef.current.set(details.location.toString(), details);
            return (
                <div className="flex flex-row items-center justify-center bg-gray-100 rounded-md p-1 border border-gray-200">
                    <Key text={counter.count.toString()} />
                </div>
            )
        },
        generateRender: (details: VisitDetails) => {
            counter.count++;
            currentKeysRef.current.set(details.location.toString(), details);
            return (
                <div>
                    <Key text={counter.count.toString()} />
                    {details.layout.type}
                </div>
            )
        },
        generateSelected: (details: VisitDetails) => {
            return false;
        },
    }
}

export function MoveWindowFromCommand(props: MoveWindowFromCommandProps) {
    const { sendInvoke, sendMessage } = useContext(window.ModalCommanderContext)
    const windowManagementState = useMainState<FrontendState>('@modal-commander/builtins#MoveWindowFromCommand')

    const [selectedSource, setSelectedSource] = useState<VisitDetails | null>(null);

    const [initialApplication, setInitialApplication] = useState<string | null>(null);

    const currentKeysRef = useRef<Map<string, VisitDetails>>(new Map());

    // Set AppToMove based on source and currentApplication
    // useEffect(() => {
    //     if (initialApplication === null) {
    //         if (props.source === "app") {
    //             if (windowManagementState?.currentApplication && windowManagementState?.currentApplication?.name) {
    //                 setSelectedSource({
    //                     applicationName: windowManagementState?.currentApplication?.name || "",
    //                     windows: null
    //                 });
    //                 setInitialApplication(windowManagementState?.currentApplication?.name || "");
    //             }
    //         } else if (props.source === "window") {
    //             if (windowManagementState?.currentApplication && windowManagementState?.currentApplication?.focusedWindow) {
    //                 setSelectedSource({
    //                     applicationName: windowManagementState?.currentApplication?.focusedWindow?.title || "",
    //                     windows: [windowManagementState?.currentApplication?.focusedWindow?.id]
    //                 });
    //                 setInitialApplication(windowManagementState?.currentApplication?.focusedWindow?.title || "");
    //             }
    //         } else if (props.source !== null) {
    //             const window = windowManagementState?.windows.find(window => window.id === props.source);
    //             if (window) {
    //                 setSelectedSource({
    //                     applicationName: window.application,
    //                     windows: [window.id]
    //                 });
    //                 setInitialApplication(window.application);
    //             }
    //         }
    //     }
    // }, [props.source, windowManagementState?.currentApplication]);

    const headerText = getWindowTitle(windowManagementState, selectedSource);

    const renderDetails = getRenderDetails(windowManagementState);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        const keyDetails = currentKeysRef.current.get(event.key);
        if (keyDetails) {
            setSelectedSource(keyDetails);
        }
    }

    const [setFocus, wrapper] = CommandWrapperWithFocus({
        ...props,
        keyHandler: handleKeyDown,
        inner: renderDetails ? (
            <div className="card-body">
                <RenderScreenSet
                    monitors={renderDetails[0]}
                    screenSet={renderDetails[1]}
                    visitor={getVisitor(selectedSource, setSelectedSource, currentKeysRef)}
                />
            </div>
        ) : null,
        next: selectedSource ? <MoveWindowToCommand index={props.index + 1} handleDelete={handleDelete} source={null} /> : null,
        headerText: headerText,
        testIdPrefix: "move-window-from-command"
    });

    function handleDelete() {
        setSelectedSource(null)
        setFocus(true)
    }

    return (wrapper);
}
