import { useCallback, useContext, useEffect, useState } from "react"
import { CommandWrapper, DefaultCommandProps, useMainState } from "./CommandWrapper"
import { DefaultVisitor, RenderScreenSet, VisitDetails } from "./RootLayout"
import { Application, FrontendState, Monitor, ScreenConfig } from "./WindowManagementTypes"
import log from "electron-log"

export type MoveSource = VisitDetails | number | "app" | "window"

export type MoveWindowToCommandProps = DefaultCommandProps & {
    source: MoveSource | null
}

// function processLayout(
//     layout: Layout<RenderOptions>,
//     source: MoveSource,
//     currentApplication: Application,
//     counter: {count: number}
// ): Layout<RenderOptions> {
//     const nextLayout: Layout<RenderOptions> = {
//         ...layout
//     }
//     if (nextLayout.type === "columns") {
//         let columns: Layout<RenderOptions>[] = [];
//         for (const column of nextLayout.columns) {
//             columns.push(processLayout(column, source, currentApplication, counter));
//         }
//         nextLayout.columns = columns;
//         return nextLayout;
//     } else if (nextLayout.type === "rows") {
//         let rows: Layout<RenderOptions>[] = [];
//         for (const row of nextLayout.rows) {
//             rows.push(processLayout(row, source, currentApplication, counter));
//         }
//         nextLayout.rows = rows;
//         return nextLayout;
//     } else if (nextLayout.type === "stack") {
//         if (nextLayout.computed) {
//             let selected: boolean = false;
//             let render: React.ReactNode | null = null;
//             if (source === "window") {
//                 const selectedWindow = nextLayout.computed.find(
//                     window => window.id === currentApplication?.focusedWindow?.id
//                 );
//                 if (selectedWindow) {
//                     selected = true;
//                     render = selectedWindow.title
//                 }
//             } else if (source === "app") {
//                 const currentApplicationWindow = nextLayout.computed.find(
//                     window => window.application === currentApplication?.name
//                 );
//                 if (currentApplicationWindow) {
//                     selected = true;
//                     render = currentApplicationWindow.title
//                 }
//             } else {
//                 const selectedWindow = nextLayout.computed.find(
//                     window => window.id === source
//                 );
//                 if (selectedWindow) {
//                     selected = true;
//                     render = selectedWindow.title
//                 }
//             }
//             nextLayout.attachment = {
//                 index: counter.count,
//                 selected: selected,
//                 render: (
//                     <>
//                         <Key text={counter.count.toString()}/> 
//                         {render}
//                     </>
//                 )
//             }
//             counter.count++;
//         }
//         return nextLayout;
//     } else if (nextLayout.type === "pinned") {
//         if (nextLayout.computed) {
//             let selected: boolean = false;
//             let render: React.ReactNode | null = null;
//             if (source === "window") {
//                 const selectedWindow = nextLayout.computed.find(
//                     window => window.id === currentApplication?.focusedWindow?.id
//                 );
//                 if (selectedWindow) {
//                     selected = true;
//                 }
//                 render = nextLayout.title
//             } else if (source === "app") {
//                 if (currentApplication?.name === nextLayout.application) {
//                     selected = true;
//                 }
//                 render = nextLayout.application
//             } else {
//                 const selectedWindow = nextLayout.computed.find(
//                     window => window.id === source
//                 );
//                 if (selectedWindow) {
//                     selected = true;
//                 }
//                 render = nextLayout.title
//             }
//             nextLayout.attachment = {
//                 index: counter.count,
//                 selected: selected,
//                 render: (
//                     <>
//                         <Key text={counter.count.toString()}/> 
//                         {render}
//                     </>
//                 )
//             }
//             counter.count++;
//         }
//         return nextLayout;
//     }
//     else if (nextLayout.type === "empty") {
//         nextLayout.attachment = {
//             index: counter.count,
//             selected: false,
//             render: (
//                 <>
//                     <Key text={counter.count.toString()}/> 
//                     Empty
//                 </>
//             )
//         }
//         counter.count++;
//         return nextLayout;
//     }
//     return nextLayout;
// }

// function processScreenConfig(
//     screenConfig: ScreenConfig,
//     source: MoveSource,
//     currentApplication: Application,
// ): ScreenConfig {
//     const nextScreenConfig: ScreenConfig = {};

//     const counter = {count: 0};

//     for (const [monitorName, layout] of Object.entries(screenConfig)) {
//         nextScreenConfig[monitorName] = processLayout(
//             layout, 
//             source, 
//             currentApplication, 
//             counter
//         );
//     }
//     return nextScreenConfig;
// }

// function getDestination(layout: Layout<RenderOptions>, index: string): number[] | null {
//     if (layout.type === "columns") {
//         for (let i = 0; i < layout.columns.length; i++) {
//             const column = layout.columns[i];
//             const destination = getDestination(column, index);
//             if (destination) {
//                 return [i, ...destination];
//             }
//         }
//     } else if (layout.type === "rows") {
//         for (let i = 0; i < layout.rows.length; i++) {
//             const row = layout.rows[i];
//             const destination = getDestination(row, index);
//             if (destination) {
//                 return [i, ...destination];
//             }
//         }
//     } else if (layout.type === "stack") {
//         if (layout.attachment?.index.toString() === index) {
//             return [];
//         }
//     } else if (layout.type === "pinned") {
//         if (layout.attachment?.index.toString() === index) {
//             return [];
//         }
//     } else if (layout.type === "empty") {
//         if (layout.attachment?.index.toString() === index) {
//             return [];
//         }
//     }

//     return null;
// }

export function MoveWindowToCommand(props: MoveWindowToCommandProps) {
    const { sendInvoke, sendMessage } = useContext(window.ModalCommanderContext)
    const windowManagementState = useMainState<FrontendState>('@modal-commander/builtins#MoveWindowToCommand')


    let monitors: Monitor[] | null = null;
    let screenConfig: ScreenConfig | null = null;
    let headerText = "Move Window To"
    if (windowManagementState) {
        monitors = windowManagementState.monitors;
        if (windowManagementState.currentLayout) {
            screenConfig = windowManagementState.currentLayout;
            const currentApplication = windowManagementState.currentApplication;
            if (currentApplication) {
                // screenConfig = processScreenConfig(screenConfig, props.source, currentApplication);
                // if (props.source === "app") {
                //     headerText = `Move ${currentApplication?.name} To`
                // } else if (props.source === "window") {
                //     headerText = `Move ${currentApplication?.focusedWindow?.title} To`
                // } else {
                //     const window = windowManagementState.windows.find(window => window.id === props.source);
                //     if (window) {
                //         headerText = `Move ${window.title} To`
                //     }
                // }
            }
        }
    }

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (!screenConfig) {
            log.warn("No layout found");
            return;
        }
        // const index = event.key
        // let destination: number[] | null = null;
        // let destinationMonitor: string | null = null;
        // for (const [monitorName, layout] of Object.entries(screenConfig)) {
        //     destination = getDestination(layout, index);
        //     if (destination) {
        //         destinationMonitor = monitorName;
        //         break;
        //     }
        // }
        // if (destination) {
        //     sendInvoke({
        //         command: '@modal-commander/builtins#MoveWindowToCommand',
        //         type: 'moveWindowTo',
        //         monitor: destinationMonitor,
        //         destination: destination,
        //         source: props.source
        //     }).then(
        //         () => sendMessage({ command: "hide" })
        //     );
        // }

        return;
    }

    return (
        <CommandWrapper
            {...props}
            keyHandler={handleKeyDown}
            testIdPrefix="move-window-to"
            headerText={headerText}
            inner={
                monitors && screenConfig ? (
                    <div className="card-body">
                        <RenderScreenSet
                            monitors={monitors}
                            screenSet={screenConfig}
                            visitor={DefaultVisitor}
                        />
                    </div>
                ) : null
            }
        />
    );
}
