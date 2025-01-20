import { useCallback,useEffect,  useContext, useState } from "react"
import { CommandWrapper, DefaultCommandProps, defaultCommandProps, useFocus } from "./CommandWrapper"
import { Key } from "./Key"
import { FrontendState, Monitor, SCREEN_PRIMARY, WindowManagerLayout } from "./WindowManagementTypes"
import log from "electron-log"

export type LayoutCommandProps = DefaultCommandProps

const columnCss = "rounded-md text-xs bg-white flex flex-col border border-gray-300"
const columnStyle = { fontSize: "0.5rem" }
const layoutWidth = 160;
const layoutHeight = 100;

// type LayoutProps = {
//     layout: LayoutType
//     frame: Geometry
// }

// function Window({ frame, text }: { frame: Geometry, text: string }) {
//     return (
//         <div style={{ ...columnStyle, width: frame.w, height: frame.h }} className={columnCss}>
//             <div style={{ height: "4px" }} className="bg-gray-200 rounded-t-md flex flex-row items-center justify-start pl-1">
//                 <div style={{ height: "2px", width: "2px" }} className="bg-red-500 rounded-full"></div>
//                 <div style={{ height: "2px", width: "2px" }} className="bg-yellow-500 rounded-full"></div>
//                 <div style={{ height: "2px", width: "2px" }} className="bg-green-500 rounded-full"></div>
//             </div>
//             <hr className="border-gray-300" />
//             <div className="flex h-full items-center justify-center text-center">{text}</div>
//         </div>
//     );
// }


// function Layout({ layout, frame }: LayoutProps) {
//     if (layout.type === "columns") {
//         let columns = [];
//         for (const column of layout.columns) {
//             let columnWidth = (column.percentage / 100) * frame.w;
//             columns.push(<Layout layout={column} frame={{ w: columnWidth, h: frame.h, x: frame.x, y: frame.y }} />)
//         }

//         return (
//             <div className="flex flex-row">
//                 {columns}
//             </div>
//         );
//     } else if (layout.type === "rows") {
//         let rows = [];
//         for (const row of layout.rows) {
//             let rowHeight = (row.percentage / 100) * frame.h;
//             rows.push(<Layout layout={row} frame={{ w: frame.w, h: rowHeight, x: frame.x, y: frame.y }} />)
//         }

//         return (
//             <div className="flex flex-col">
//                 {rows}
//             </div>
//         );
//     }
//     else if (layout.type === "stack") {
//         return <Window frame={{ w: frame.w, h: frame.h, x: frame.x, y: frame.y }} text="Stack" />
//     }
//     else if (layout.type === "pinned") {
//         return <Window frame={{ w: frame.w, h: frame.h, x: frame.x, y: frame.y }} text={layout.application || ""} />
//     }
//     else if (layout.type === "empty") {
//         return <Window frame={{ w: frame.w, h: frame.h, x: frame.x, y: frame.y }} text="Empty" />
//     }

//     return (<div>Unknown layout type {JSON.stringify(layout)}</div>);
// }

type RootLayoutProps = {
    layout: WindowManagerLayout
    monitors: Monitor[]
    // frame: Geometry
    // currentScreens: { name: string, primary: boolean }[]
}

function RootLayout({ layout, monitors }: RootLayoutProps) {
    for (const screenSet of layout.screenSets) {
        let foundAllScreens = true;
        for (const currentScreen of monitors) {
            if (currentScreen.main && screenSet[SCREEN_PRIMARY]) {
                continue
            }
            if (screenSet[currentScreen.name]) {
                continue
            }
            foundAllScreens = false;
            break;
        }
        if (foundAllScreens) {
            let screenLayout = screenSet[monitors[0].name]
            if (!screenLayout && monitors[0].main) {
                screenLayout = screenSet[SCREEN_PRIMARY];
            }
            if (!screenLayout) {
                return <div key={layout.name}>Unable to find matching screens for layout {layout.name}</div>
            }
            return (
                <div key={layout.name}>
                    <div style={{ width: layoutWidth }} className="flex flex-row items-center justify-center p-1 gap-1">
                        <Key text={layout.quickKey}></Key>
                        <div className="text-xs">{layout.name}</div>
                    </div>
                    <div className="p-1 rounded-sm bg-black relative">
                        {/* <Layout layout={screenLayout} frame={frame} /> */}
                    </div>
                </div>
            )
        }
    }

    return (
        <div key={layout.name}>
            <div
                style={{ width: layoutWidth }}
                className="flex flex-row items-center justify-center p-1 gap-1">
                Unable to find matching screens for layout {layout.name}
            </div>
        </div>
    );
}

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
                            windowManagementState.layouts.map((layout: WindowManagerLayout) => (
                                <RootLayout
                                    layout={layout}
                                    monitors={windowManagementState.monitors}
                                    // frame={{ w: layoutWidth, h: layoutHeight, x: 0, y: 0 }}
                                    // currentScreens={windowManagementState.monitors}
                                />
                            ))
                        }
                    </div>
                ) : null
            }
        />
    );
}
