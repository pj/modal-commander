import { useCallback, useContext, useEffect, useRef, useState } from "react"
import { CommandWrapper, DefaultCommandProps, useMainState } from "./CommandWrapper"
import { DEFAULT_LAYOUT_WIDTH, DEFAULT_LAYOUT_HEIGHT, NodeVisitor, RenderScreenSet } from "./RootLayout"
import { FrontendState, VisitDetails } from "./WindowManagementTypes"
import log from "electron-log"
import { getRenderDetails } from "./MoveWindowFromCommand"
import { DownChevron } from "./RightChevron"
import { RightChevron } from "./RightChevron"
import { Key } from "./Key"
import { deepEquals } from "./Utils"

export type MoveWindowToCommandProps = DefaultCommandProps & {
    source: VisitDetails
}

function getWindowTitle(windowManagementState: FrontendState | undefined, source: VisitDetails | null): string {
    const defaultTitle = "Move To"
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
            return `Move To Stack`
        } else {
            return `Move To ${source.applicationName}`
        }
    }

    // Show window title if a single window is selected
    if (source.windows.length === 1) {
        return `Move To ${source.windows[0]}`
    } else {
        return `Move ${source.windows.length} Windows To ${source.applicationName}`
    }
}

function getVisitor(
    destination: VisitDetails | null,
    handleSelectDestination: (destination: VisitDetails) => void,
    currentKeysRef: React.MutableRefObject<Map<string, VisitDetails>>
): NodeVisitor {
    const counter = { count: -1 };
    currentKeysRef.current = new Map();
    return {
        generateOnClick: (details: VisitDetails) => (event: React.MouseEvent<HTMLDivElement>) => {
            event.preventDefault();
            event.stopPropagation();
            handleSelectDestination(details);
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
            return deepEquals(destination, details);
        },
    }
}

export function MoveWindowToCommand(props: MoveWindowToCommandProps) {
    const { sendInvoke, sendMessage } = useContext(window.ModalCommanderContext)
    const windowManagementState = useMainState<FrontendState>('@modal-commander/builtins#MoveWindowToCommand')

    const [destination, setDestination] = useState<VisitDetails | null>(null);

    const currentKeysRef = useRef<Map<string, VisitDetails>>(new Map());

    const headerText = getWindowTitle(windowManagementState, destination);

    const renderDetails = getRenderDetails(windowManagementState);

    const handleSelectDestination = (destination: VisitDetails) => {
        setDestination(destination);
        sendInvoke({ 
            command: '@modal-commander/builtins#MoveWindowToCommand', 
            type: "moveWindowTo",
            destination: destination,
            source: props.source
        }).then(() => {
            sendMessage({ command: 'hide' })
        });
    }

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        const keyDetails = currentKeysRef.current.get(event.key);
        if (keyDetails) {
            handleSelectDestination(keyDetails);
        }
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
                            visitor={getVisitor(destination, handleSelectDestination, currentKeysRef)}
                            layoutWidth={DEFAULT_LAYOUT_WIDTH}
                            layoutHeight={DEFAULT_LAYOUT_HEIGHT}
                        />
                    </div>
                ) : null
            }
        />
    );
}
