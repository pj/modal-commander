import { useContext, useRef, useReducer, useEffect, useState } from "react"
import { CommandWrapperWithFocus, DefaultCommandProps, useMainState } from "./CommandWrapper"
import { Key } from "./Key"
import { MoveWindowToCommand } from "./MoveWindowToCommand"
import { DownChevron, RightChevron, WindowIcon } from "./RightChevron"
import { DEFAULT_LAYOUT_WIDTH, DEFAULT_LAYOUT_HEIGHT, NodeVisitor, RenderScreenSet } from "./RootLayout"
import { deepEquals } from "./Utils"
import { FrontendState, Layout, Monitor, ScreenConfig, VisitDetails } from "./WindowManagementTypes"

export type MoveSource = VisitDetails | number | "app" | "window" | null;

export type MoveWindowFromCommandProps = DefaultCommandProps & { source: MoveSource | null };

export function getRenderDetails(state: FrontendState | undefined): [Monitor[], ScreenConfig] | null {
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

    // Just show applicaiton name if no windows are selected
    if (!source.windows) {
        if (source.layout.type === "stack") {
            return `Move Stack From`
        } else {
            return `Move ${source.applicationName} From`
        }
    }

    // Show window title if a single window is selected
    if (source.windows.length === 1) {
        return `Move ${source.windows[0]} From`
    } else {
        return `Move ${source.windows.length} ${source.applicationName} Windows From`
    }
}

function WindowEditModal(props: {
    onClose: () => void,
    onSave: () => void,
    id: string
}) {
    const [visible, setVisible] = useState(false);
    const modalRef = useRef<HTMLDialogElement>(null);

    // useEffect(() => {
    //   if (!modalRef.current) {
    //     return;
    //   }
    //   visible ? modalRef.current.showModal() : modalRef.current.close();
    // }, [visible]);
    return (
        <>
            <button
                className="btn"
                onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setVisible(true);
                }}>
                open modal
            </button>
            <dialog ref={modalRef} id={props.id} className="modal" open={visible} onCancel={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setVisible(false);
            }}>
                <div className="modal-box">
                    <h3 className="text-lg font-bold">Hello!</h3>
                    <p className="py-4">Press ESC key or click the button below to close</p>
                    <div className="modal-action">
                        <form method="dialog">
                            <button className="btn" onClick={() => {
                                setVisible(false);
                            }}>Close</button>
                        </form>
                    </div>
                </div>
            </dialog>
        </>
    )
}

function getVisitor(
    selectedSource: VisitDetails | null,
    setSelectedSource: (source: VisitDetails) => void,
    currentKeysRef: React.MutableRefObject<Map<string, VisitDetails>>
): NodeVisitor {
    const counter = { count: -1 };
    currentKeysRef.current = new Map();
    return {
        generateOnClick: (details: VisitDetails) => (event: React.MouseEvent<HTMLDivElement>) => {
            event.preventDefault();
            event.stopPropagation();
            setSelectedSource(details);
        },
        generateDirectionLeader: (details: VisitDetails) => {
            counter.count++;
            currentKeysRef.current.set(counter.count.toString(), details);
            const flexDirection = details.layout.type === "columns" ? "flex-col" : "flex-row";
            const arrow = details.layout.type === "columns" ? <RightChevron /> : <DownChevron />;
            return (
                <div className={`flex ${flexDirection} items-center justify-around bg-gray-100 rounded-md p-1 border border-gray-200`}>
                    {arrow}
                    <Key text={counter.count.toString()} size="sm" />
                    {arrow}
                </div>
            );
        },
        generateRender: (details: VisitDetails) => {
            counter.count++;
            currentKeysRef.current.set(counter.count.toString(), details);
            let body: React.ReactNode = details.layout.type;
            if (details.layout.type === "pinned") {
            //     const windowOptions = [];
            //     if (details.layout.computed && details.layout.computed.length > 1) {
            //         // for (const window of details.layout.computed || []) {
            //         //     // @ts-ignore
            //         //     windowOptions.push(React.createElement("li", { key: window.id }, window.title))
            //         // }
            //         // body = (
            //         //     <div className="dropdown">
            //         //         <div tabIndex={0} role="button" className="btn btn-xs btn-primary text-xxs">
            //         //             {details.applicationName}
            //         //         </div>
            //         //         <ul tabIndex={0} className="menu dropdown-content bg-base-100 rounded-box z-[10] p-2 shadow">
            //         //             <li>All</li>
            //         //             {windowOptions}
            //         //         </ul>
            //         //     </div>
            //         // );
            //         return (
            //             <div className="flex flex-row items-center justify-center gap-1 h-full w-full">
            //                 <Key text={counter.count.toString()} size="xs" />
            //                 {body}
            //             </div>
            //         )
            //     } else {
            //         return (
            //             <div className="flex flex-row items-center justify-center gap-1 h-full w-full">
            //                 <Key text={counter.count.toString()} size="xs" />
            //                 <span className="text-xxs">{details.applicationName}</span>
            //             </div>
            //         )
            //     }
                return (
                    <div className="flex flex-row items-center justify-center gap-1 h-full w-full">
                        <Key text={counter.count.toString()} size="xs" />
                        <span className="text-xxs">{details.applicationName}</span>
                    </div>
                )
            } else if (details.layout.type === "stack") {
                return (
                    <div className="flex flex-row items-center justify-center gap-1 h-full w-full">
                        <Key text={counter.count.toString()} size="xs" />
                        {/* <WindowEditModal id={`window-from-edit-modal-${counter.count}`} onClose={() => { }} onSave={() => { }} /> */}
                        Stack
                    </div>
                )
            }
            return (
                <div>
                    <Key text={counter.count.toString()} />
                    {body}
                </div>
            )
        },
        generateSelected: (details: VisitDetails) => {
            return deepEquals(selectedSource, details);
        },
    }
}

function findLocation(layout: Layout, searchDetails: VisitDetails): VisitDetails | null {
    if (layout.type === "columns") {
        for (let i = 0; i < layout.columns.length; i++) {
            const column = layout.columns[i];
            const destination = findLocation(column, searchDetails);
            if (destination) {
                return {
                    ...destination,
                    location: [i, ...destination.location]
                };
            }
        }
    } else if (layout.type === "rows") {
        for (let i = 0; i < layout.rows.length; i++) {
            const row = layout.rows[i];
            const destination = findLocation(row, searchDetails);
            if (destination) {
                return {
                    ...destination,
                    location: [i, ...destination.location]
                };
            }
        }
    } else if (layout.type === "stack") {
        return {
            ...searchDetails,
            location: [],
            layout: layout,
        };
    } else if (layout.type === "pinned") {
        if (layout.application === searchDetails.applicationName) {
            if (!searchDetails.windows) {
                return {
                    ...searchDetails,
                    location: [],
                    layout: layout,
                };
            }
            let foundSearchIds = new Set<number>();
            for (const window of layout.computed || []) {
                for (const searchId of searchDetails.windows || []) {
                    if (window.id === searchId) {
                        foundSearchIds.add(searchId);
                    }
                }
            }
            if (foundSearchIds.size === searchDetails.windows.length) {
                return {
                    ...searchDetails,
                    location: [],
                    layout: layout,
                };
            }
        }

        return null;
    } else if (layout.type === "empty") {
        return null;
    }

    throw new Error(`Invalid layout type ${layout.type}`);
}

function getDetailsFromSource(source: MoveSource | null, windowManagementState: FrontendState): VisitDetails | null {
    if (source === null) {
        return null;
    }

    if (source === "app") {
        const currentApplication = windowManagementState.currentApplication;
        if (currentApplication && windowManagementState.currentLayout) {
            for (const [monitor, layout] of Object.entries(windowManagementState.currentLayout)) {
                const destination = findLocation(
                    layout,
                    {
                        applicationName: currentApplication.name,
                        bundleId: currentApplication.bundleId,
                        windows: null,
                        layout: layout,
                        monitor: monitor,
                        location: [],
                    }
                );

                if (destination) {
                    return destination;
                }
            }
        }
        return null
    }

    if (source === "window") {
        const currentApplication = windowManagementState.currentApplication;
        if (currentApplication && windowManagementState.currentLayout) {
            for (const [monitor, layout] of Object.entries(windowManagementState.currentLayout)) {
                const destination = findLocation(
                    layout,
                    {
                        applicationName: currentApplication.name,
                        bundleId: currentApplication.bundleId,
                        windows: currentApplication.focusedWindow ? [currentApplication.focusedWindow.id] : null,
                        layout: layout,
                        monitor: monitor,
                        location: [],
                    }
                );

                if (destination) {
                    return destination;
                }
            }
        }

        return null
    }

    if (typeof source === "number") {
        const window = windowManagementState.windows.find(window => window.id === source);
        if (window && windowManagementState.currentLayout) {
            for (const [monitor, layout] of Object.entries(windowManagementState.currentLayout)) {
                const destination = findLocation(
                    layout,
                    {
                        applicationName: window.application,
                        bundleId: window.bundleId,
                        windows: [window.id],
                        layout: layout,
                        monitor: monitor,
                        location: [],
                    }
                );

                if (destination) {
                    return destination;
                }
            }
        }
        return null;
    }

    return source;
}

type SelectedState = {
    details: VisitDetails | null,
    initialized: boolean
}

export function MoveWindowFromCommand(props: MoveWindowFromCommandProps) {
    const { sendInvoke, sendMessage } = useContext(window.ModalCommanderContext)
    const windowManagementState = useMainState<FrontendState>('@modal-commander/builtins#MoveWindowFromCommand')

    const [selectedState, setSelectedState] = useReducer(
        (state: SelectedState, action: SelectedState) => {
            return {
                ...state,
                ...action
            }
        },
        {
            details: null,
            initialized: false
        }
    );

    const setSelectedSource = (details: VisitDetails) => {
        setSelectedState({ details: details, initialized: true });
    }

    const currentKeysRef = useRef<Map<string, VisitDetails>>(new Map());

    // Set AppToMove based on source and currentApplication
    useEffect(() => {
        if (!selectedState.initialized) {
            if (windowManagementState?.currentApplication) {
                const details = getDetailsFromSource(props.source, windowManagementState);
                setSelectedState({ details: details, initialized: true });
            }
        }
    }, [props.source, windowManagementState?.currentApplication]);

    const headerText = getWindowTitle(windowManagementState, selectedState.details);

    const renderDetails = getRenderDetails(windowManagementState);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        const keyDetails = currentKeysRef.current.get(event.key);
        if (keyDetails) {
            setSelectedState({ details: keyDetails, initialized: true });
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
                    visitor={getVisitor(selectedState.details, setSelectedSource, currentKeysRef)}
                    layoutWidth={DEFAULT_LAYOUT_WIDTH}
                    layoutHeight={DEFAULT_LAYOUT_HEIGHT}
                />
            </div>
        ) : null,
        next: selectedState.details ? <MoveWindowToCommand index={props.index + 1} handleDelete={handleDelete} source={selectedState.details} /> : null,
        headerText: headerText,
        testIdPrefix: "move-window-from-command"
    });

    function handleDelete() {
        setSelectedState({ details: null, initialized: true });
        setFocus(true)
    }

    return (wrapper);
}
