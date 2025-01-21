import { useCallback,useEffect,  useContext, useState } from "react"
import { CommandWrapper, DefaultCommandProps, defaultCommandProps, useFocus } from "./CommandWrapper"
import { Key } from "./Key"
import { Bounds, Layout as LayoutType } from "./WindowManagementTypes"
import { FrontendState, Monitor, SCREEN_PRIMARY, WindowManagerLayout } from "./WindowManagementTypes"
import log from "electron-log"

export type LayoutCommandProps = DefaultCommandProps

const columnCss = "rounded-md text-xs bg-white flex flex-col border border-gray-300"
const columnStyle = { fontSize: "0.5rem" }
const layoutWidth = 160;
const layoutHeight = 100;

type LayoutProps = {
    layout: LayoutType
    frame: Bounds
    margin: string
}

const SIZE_RATIO = 0.1;

function Window({ frame, text, margin }: { frame: Bounds, text: string, margin: string }) {
    console.log("Window", frame, text)
    return (
        <div style={{ ...columnStyle, width: frame.width * SIZE_RATIO, height: frame.height * SIZE_RATIO }} className={columnCss + " " + margin}>
            <div style={{ height: "4px" }} className="bg-gray-200 rounded-t-md flex flex-row items-center justify-start pl-1">
                <div style={{ height: "2px", width: "2px" }} className="bg-red-500 rounded-full"></div>
                <div style={{ height: "2px", width: "2px" }} className="bg-yellow-500 rounded-full"></div>
                <div style={{ height: "2px", width: "2px" }} className="bg-green-500 rounded-full"></div>
            </div>
            <hr className="border-gray-300" />
            <div className="flex h-full items-center justify-center text-center">{text}</div>
        </div>
    );
}


function Layout({ layout, frame, margin }: LayoutProps) {
    if (layout.type === "columns") {
        let columns = [];
        for (let i = 0; i < layout.columns.length; i++) {
            let column = layout.columns[i];
            let margin = "";
            if (i > 0) {
                margin = "ml-1";
            }
            let columnWidth = (column.percentage / 100) * frame.width;
            columns.push(
                <Layout 
                    layout={column} 
                    frame={{ width: columnWidth, height: frame.height, x: frame.x, y: frame.y }} 
                    margin={margin}
                />
            )
        }

        const className = "flex flex-row " + margin;
        return (
            <div className={className}>
                {columns}
            </div>
        );
    } else if (layout.type === "rows") {
        let rows = [];
        for (let i = 0; i < layout.rows.length; i++) {
            let row = layout.rows[i];
            let rowHeight = (row.percentage / 100) * frame.height;
            let margin = "";
            if (i > 0) {
                margin = "mt-1";
            }
            rows.push(<Layout layout={row} frame={{ width: frame.width, height: rowHeight, x: frame.x, y: frame.y }} margin={margin} />)
        }

        const className = "flex flex-col " + margin;
        return (
            <div className={className}>
                {rows}
            </div>
        );
    }
    else if (layout.type === "stack") {
        return <Window frame={{ width: frame.width, height: frame.height, x: frame.x, y: frame.y }} text="Stack" margin={margin} />
    }
    else if (layout.type === "pinned") {
        return <Window frame={{ width: frame.width, height: frame.height, x: frame.x, y: frame.y }} text={layout.application || ""} margin={margin} />
    }
    else if (layout.type === "empty") {
        return <Window frame={{ width: frame.width, height: frame.height, x: frame.x, y: frame.y }} text="Empty" margin={margin} />
    }

    return (<div>Unknown layout type {JSON.stringify(layout)}</div>);
}

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
                        <Layout layout={screenLayout} frame={monitors[0].bounds} margin="" />
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
