import log from "electron-log"
import { Key } from "./Key"
import { Bounds, Layout, Monitor, SCREEN_PRIMARY, WindowManagerLayout, ScreenConfig as BaseScreenConfig, ScreenConfig, VisitDetails } from "./WindowManagementTypes"
import { findMatchingScreenSet } from "./WindowManagerUtils"

const columnCss = "rounded-md bg-white flex flex-col border border-gray-300 h-full w-full"

const MONITOR_NAME_HEIGHT = 16;
export const DEFAULT_LAYOUT_WIDTH = 320;
export const DEFAULT_LAYOUT_HEIGHT = 240;

type WindowProps = {
    frame: Bounds;
    text: React.ReactNode;
    layout: Layout;
    selected?: boolean;
    onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
}

export type NodeVisitor = {
    generateOnClick(details: VisitDetails): (event: React.MouseEvent<HTMLDivElement>) => void;
    generateDirectionLeader(details: VisitDetails, direction: "rows" | "columns"): React.ReactNode | null;
    generateRender(details: VisitDetails): React.ReactNode | null;
    generateSelected(details: VisitDetails): boolean;
}

export const DefaultVisitor: NodeVisitor = {
    generateOnClick: () => () => {},
    generateDirectionLeader: () => null,
    generateRender: (visitDetails: VisitDetails) => {
        if (visitDetails.layout.type === "stack") {
            return <span className="text-xs">Stack</span>
        } else if (visitDetails.layout.type === "pinned") {
            return <span className="text-xs">{visitDetails.applicationName}</span>
        } else if (visitDetails.layout.type === "empty") {
            return <span className="text-xs">Empty</span>
        } 
        return null;
    },
    generateSelected: () => false,
}

function Window({ selected, text, onClick }: WindowProps) {
    const selectedClass = selected ? "ring-2 ring-blue-500" : "";
    return (
        <div
            onClick={onClick}
            className={`${columnCss} ${selectedClass}`}
        >
            <div style={{ height: "4px" }} className="bg-gray-200 rounded-t-md flex flex-row items-center justify-start pl-1">
                <div style={{ height: "2px", width: "2px" }} className="bg-red-500 rounded-full"></div>
                <div style={{ height: "2px", width: "2px" }} className="bg-yellow-500 rounded-full"></div>
                <div style={{ height: "2px", width: "2px" }} className="bg-green-500 rounded-full"></div>
            </div>
            <hr className="border-gray-300" />
            <div className="flex flex-col h-full items-center justify-center text-center">
                {text}
            </div>
        </div>
    );
}

type LayoutProps = {
    layout: Layout;
    frame: Bounds;
    visitor: NodeVisitor;
    location: number[];
    monitor: string;
}

export function LayoutNode({ layout, frame, visitor, location, monitor }: LayoutProps) {
    if (layout.type === "columns") {
        const details = { location, layout, monitor, applicationName: null, windows: null };
        let columns = [];
        const directionLeader = visitor.generateDirectionLeader(details, "columns");
        for (let i = 0; i < layout.columns.length; i++) {
            let column = layout.columns[i];
            columns.push(
                <div key={i} style={{ width: `${column.percentage}%`, height: '100%' }}>
                    <LayoutNode
                        layout={column}
                        frame={frame}
                        visitor={visitor}
                        location={[...location, i]}
                        monitor={monitor}
                    />
                </div>
            )
        }

        const selected = visitor.generateSelected(details) ? "ring-2 ring-blue-500" : "";
        const className = "flex flex-row items-stretch h-full gap-1 " + selected;
        return (
            <div onClick={visitor.generateOnClick(details)} className={className}>
                {directionLeader}
                {columns}
            </div>
        );
    } else if (layout.type === "rows") {
        let rows = [];
        const details = { location, layout, monitor, applicationName: null, windows: null };
        const directionLeader = visitor.generateDirectionLeader(details, "rows");
        for (let i = 0; i < layout.rows.length; i++) {
            let row = layout.rows[i];
            rows.push(
                <div key={i} style={{ height: `${row.percentage}%`, width: '100%' }}>
                    <LayoutNode
                        layout={row}
                        frame={frame}
                        visitor={visitor}
                        location={[...location, i]}
                        monitor={monitor}
                    />
                </div>
            )
        }

        const selected = visitor.generateSelected(details) ? "ring-2 ring-blue-500" : "";
        const className = "flex flex-col h-full gap-1 " + selected;
        return (
            <div onClick={visitor.generateOnClick(details)} className={className}>
                {directionLeader}
                {rows}
            </div>
        );
    }
    else if (layout.type === "stack") {
        const details = { location, layout, monitor, applicationName: null, windows: null };
        return <Window 
            frame={frame} 
            text={visitor.generateRender(details) || "Stack"}
            layout={layout} 
            selected={visitor.generateSelected(details)}
            onClick={visitor.generateOnClick(details)}
            />
    }
    else if (layout.type === "pinned") {
        const details = { location, layout, monitor, applicationName: layout.application || "", windows: null };
        return <Window 
            frame={frame} 
            text={visitor.generateRender(details) || layout.application || ""} 
            layout={layout} 
            selected={visitor.generateSelected(details)}
            onClick={visitor.generateOnClick(details)}
        />
    }
    else if (layout.type === "empty") {
        const details = { location, layout, monitor, applicationName: null, windows: null };
        return <Window 
            frame={frame} 
            text={visitor.generateRender(details) || "Empty"} 
            layout={layout} 
            selected={visitor.generateSelected(details)}
            onClick={visitor.generateOnClick(details)}
        />
    }

    return (<div>Unknown layout type {JSON.stringify(layout)}</div>);
}

export type RenderScreenSetProps = {
    monitors: Monitor[];
    screenSet: ScreenConfig;
    visitor: NodeVisitor;
    layoutWidth: number;
    layoutHeight: number;
}

export function RenderScreenSet({ monitors, screenSet, visitor, layoutWidth, layoutHeight }: RenderScreenSetProps) {
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

    const scaleX = layoutWidth / realWidth;
    const totalComputedHeight = realHeight * scaleX;
    const offsetY = (layoutHeight - totalComputedHeight) / 2;

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
                    height: (monitor.bounds.height * scaleX) + MONITOR_NAME_HEIGHT + 8,
                    left: monitor.bounds.x * scaleX,
                    top: (normalizedY * scaleX) + offsetY,
                }}
            >
                <div className="text-xs text-white flex items-center justify-center" style={{ height: MONITOR_NAME_HEIGHT }}>
                    {monitor.name}
                </div>

                <div style={{ height: `${monitor.bounds.height * scaleX}px` }}>
                    <LayoutNode
                        layout={layout}
                        frame={monitor.bounds}
                        visitor={visitor}
                        location={[]}
                        monitor={monitor.name}
                    />
                </div>
            </div>
        );
    }
    return (
        <div className="relative" style={{ width: layoutWidth, height: layoutHeight }}>
            {screenNodes}
        </div>
    );
}
