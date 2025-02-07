import log from "electron-log"
import { Key } from "./Key"
import { Bounds, Layout, Monitor, SCREEN_PRIMARY, WindowManagerLayout, ScreenConfig as BaseScreenConfig, ScreenConfig } from "./WindowManagementTypes"
import { findMatchingScreenSet } from "./WindowManagerUtils"

const columnCss = "rounded-md text-xs bg-white flex flex-col border border-gray-300"
const columnStyle = { fontSize: "0.5rem" }

// Extended types that include selection state and a react node to render inside the layout box.
export type RenderOptions = {
    selected?: boolean;
    render?: React.ReactNode;
    index: number;
    onClick?: () => void;
    directionLeader?: React.ReactNode;
}

type RootLayoutProps = {
    layout: WindowManagerLayout;
    monitors: Monitor[];
}

type WindowProps = {
    frame: Bounds;
    text: string;
    margin: string;
    layout: Layout<RenderOptions>;
}

function Window({ frame, text, margin, layout }: WindowProps) {
    const selectedClass = layout.attachment?.selected ? "ring-2 ring-blue-500" : "";
    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                fontSize: "0.5rem"
            }}
            onClick={layout.attachment?.onClick}
            className={`${columnCss} ${margin} ${selectedClass}`}
        >
            <div style={{ height: "4px" }} className="bg-gray-200 rounded-t-md flex flex-row items-center justify-start pl-1">
                <div style={{ height: "2px", width: "2px" }} className="bg-red-500 rounded-full"></div>
                <div style={{ height: "2px", width: "2px" }} className="bg-yellow-500 rounded-full"></div>
                <div style={{ height: "2px", width: "2px" }} className="bg-green-500 rounded-full"></div>
            </div>
            <hr className="border-gray-300" />
            <div className="flex h-full items-center justify-center text-center">
                {layout.attachment?.render ? layout.attachment.render : text}
            </div>
        </div>
    );
}

type LayoutProps = {
    layout: Layout<RenderOptions>;
    frame: Bounds;
    margin: string;
}

export function LayoutNode({ layout, frame, margin }: LayoutProps) {
    if (layout.type === "columns") {
        let columns = [];
        for (let i = 0; i < layout.columns.length; i++) {
            let column = layout.columns[i];
            let margin = "";
            if (i > 0) {
                margin = "ml-1";
            }
            columns.push(
                <div key={i} style={{ width: `${column.percentage}%`, height: '100%' }}>
                    <LayoutNode
                        layout={column}
                        frame={frame}
                        margin={margin}
                    />
                </div>
            )
        }

        const className = "flex flex-row h-full " + margin;
        return (
            <div onClick={layout.attachment?.onClick} className={className}>
                {layout.attachment?.directionLeader}
                {columns}
            </div>
        );
    } else if (layout.type === "rows") {
        let rows = [];
        for (let i = 0; i < layout.rows.length; i++) {
            let row = layout.rows[i];
            let margin = "";
            if (i > 0) {
                margin = "mt-1";
            }
            rows.push(
                <div key={i} style={{ height: `${row.percentage}%`, width: '100%' }}>
                    {row.attachment?.directionLeader}
                    <LayoutNode
                        layout={row}
                        frame={frame}
                        margin={margin}
                    />
                </div>
            )
        }

        const className = "flex flex-col h-full " + margin;
        return (
            <div onClick={layout.attachment?.onClick} className={className}>
                {rows}
            </div>
        );
    }
    else if (layout.type === "stack") {
        return <Window frame={frame} text="Stack" margin={margin} layout={layout} />
    }
    else if (layout.type === "pinned") {
        return <Window frame={frame} text={layout.application || ""} margin={margin} layout={layout} />
    }
    else if (layout.type === "empty") {
        return <Window frame={frame} text="Empty" margin={margin} layout={layout} />
    }

    return (<div>Unknown layout type {JSON.stringify(layout)}</div>);
}

export type RenderScreenSetProps = {
    monitors: Monitor[];
    screenSet: ScreenConfig;
}

const ActualWidth = 320;
const ActualHeight = 240;
export function RenderScreenSet({ monitors, screenSet }: RenderScreenSetProps) {
    let minWidth = Infinity;
    let minHeight = Infinity;
    let maxWidth = 0;
    let maxHeight = 0;
    let primaryMonitor = null;
    for (const monitor of monitors) {
        if (monitor.main) {
            primaryMonitor = monitor;
        }
    }

    if (!primaryMonitor) {
        log.warn("No primary monitor found");
        return;
    }

    for (const monitor of monitors) {
        if ((monitor.bounds.x + monitor.bounds.width) > maxWidth) {
            maxWidth = monitor.bounds.x + monitor.bounds.width;
        }
        if (monitor.bounds.x < minWidth) {
            minWidth = monitor.bounds.x;
        }
        // Convert coordinates to be based on top left.
        const normalizedY = primaryMonitor.bounds.height - (monitor.bounds.height + monitor.bounds.y);
        if ((normalizedY + monitor.bounds.height) > maxHeight) {
            maxHeight = normalizedY + monitor.bounds.height;
        }
        if (normalizedY < minHeight) {
            minHeight = normalizedY;
        }
    }

    const realWidth = maxWidth - minWidth;
    const realHeight = maxHeight - minHeight;

    const scaleX = ActualWidth / realWidth;
    const totalComputedHeight = realHeight * scaleX;
    const offsetY = (ActualHeight - totalComputedHeight) / 2;

    const screenNodes = [];
    for (const [monitorName, layout] of Object.entries(screenSet)) {
        const monitor = monitors.find(m => m.name === monitorName || (m.main && monitorName === SCREEN_PRIMARY));
        if (!monitor) {
            log.warn(`Unable to find monitor ${monitorName} for screen set ${JSON.stringify(screenSet)}`);
            continue;
        }
        const normalizedY = primaryMonitor.bounds.height - (monitor.bounds.height + monitor.bounds.y);
        screenNodes.push(
            <div
                key={monitorName} 
                className="p-1 rounded-sm bg-black absolute" 
                style={{
                    width: monitor.bounds.width * scaleX,
                    height: monitor.bounds.height * scaleX,
                    left: monitor.bounds.x * scaleX,
                    top: (normalizedY * scaleX) + offsetY,
                }}
            >

                <LayoutNode
                    layout={layout}
                    frame={monitor.bounds}
                    margin=""
                />
            </div>
        );
    }
    return (
        <div className="relative" style={{ width: ActualWidth, height: ActualHeight }}>
            {screenNodes}
        </div>
    );
}

export function RenderLayout({ layout, monitors }: RootLayoutProps) {
    const screenSet = findMatchingScreenSet(layout, monitors);
    if (screenSet) {
        return (
            <div key={layout.name}>
                <div className="flex flex-row items-center justify-center p-1 gap-1">
                    <Key text={layout.quickKey}></Key>
                    <div className="text-xs">{layout.name}</div>
                </div>
                <RenderScreenSet monitors={monitors} screenSet={screenSet} />
            </div>
        )
    } else {
        return (
            <div key={layout.name}>
                <div
                    style={{ width: 160 }}
                    className="flex flex-row items-center justify-center p-1 gap-1">
                    Unable to find matching screens for layout {layout.name}
                </div>
            </div>
        );
    }

} 