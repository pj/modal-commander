import log from "electron-log"
import { Key } from "./Key"
import { Bounds, Layout, Monitor, SCREEN_PRIMARY, WindowManagerLayout, ScreenConfig as BaseScreenConfig, ScreenConfig } from "./WindowManagementTypes"
import { findMatchingScreenSet } from "./WindowManagerUtils"

const columnCss = "rounded-md text-xs bg-white flex flex-col border border-gray-300"
const columnStyle = { fontSize: "0.5rem" }

// Extended types that include selection state and a react node to render inside the layout box.
// export type RenderOptions = {
//     selected?: boolean;
//     render?: React.ReactNode;
//     index: number;
//     onClick?: () => void;
//     directionLeader?: React.ReactNode;
// }

type WindowProps = {
    frame: Bounds;
    text: string;
    margin: string;
    layout: Layout;
    selected?: boolean;
    onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
}

export type VisitDetails = {
    location: number[];
    layout: Layout;
    monitor: string;
    applicationName: string | null;
    windows: number[] | null;
}

export type NodeVisitor = {
    generateOnClick(details: VisitDetails): (event: React.MouseEvent<HTMLDivElement>) => void;
    generateDirectionLeader(details: VisitDetails): React.ReactNode | null;
    generateRender(details: VisitDetails): React.ReactNode | null;
    generateSelected(details: VisitDetails): boolean;
}

export const DefaultVisitor: NodeVisitor = {
    generateOnClick: () => () => {},
    generateDirectionLeader: () => null,
    generateRender: () => null,
    generateSelected: () => false,
}

function Window({ selected, text, margin, layout, onClick }: WindowProps) {
    const selectedClass = selected ? "ring-2 ring-blue-500" : "";
    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                fontSize: "0.5rem"
            }}
            onClick={onClick}
            className={`${columnCss} ${margin} ${selectedClass}`}
        >
            <div style={{ height: "4px" }} className="bg-gray-200 rounded-t-md flex flex-row items-center justify-start pl-1">
                <div style={{ height: "2px", width: "2px" }} className="bg-red-500 rounded-full"></div>
                <div style={{ height: "2px", width: "2px" }} className="bg-yellow-500 rounded-full"></div>
                <div style={{ height: "2px", width: "2px" }} className="bg-green-500 rounded-full"></div>
            </div>
            <hr className="border-gray-300" />
            <div className="flex h-full items-center justify-center text-center">
                {text}
            </div>
        </div>
    );
}

type LayoutProps = {
    layout: Layout;
    frame: Bounds;
    margin: string;
    visitor: NodeVisitor;
    location: number[];
    monitor: string;
}

export function LayoutNode({ layout, frame, margin, visitor, location, monitor }: LayoutProps) {
    if (layout.type === "columns") {
        let columns = [];
        const directionLeader = visitor.generateDirectionLeader({ location, layout, monitor, applicationName: null, windows: null });
        for (let i = 0; i < layout.columns.length; i++) {
            let column = layout.columns[i];
            let margin = "";
            if (i > 0 || directionLeader) {
                margin = "ml-1";
            }
            columns.push(
                <div key={i} style={{ width: `${column.percentage}%`, height: '100%' }}>
                    <LayoutNode
                        layout={column}
                        frame={frame}
                        margin={margin}
                        visitor={visitor}
                        location={[...location, i]}
                        monitor={monitor}
                    />
                </div>
            )
        }

        const className = "flex flex-row items-stretch h-full " + margin;
        return (
            <div onClick={visitor.generateOnClick({ location, layout, monitor, applicationName: null, windows: null })} className={className}>
                {directionLeader}
                {columns}
            </div>
        );
    } else if (layout.type === "rows") {
        let rows = [];
        const directionLeader = visitor.generateDirectionLeader({ location, layout, monitor, applicationName: null, windows: null });
        for (let i = 0; i < layout.rows.length; i++) {
            let row = layout.rows[i];
            let margin = "";
            if (i > 0 || directionLeader) {
                margin = "mt-1";
            }
            rows.push(
                <div key={i} style={{ height: `${row.percentage}%`, width: '100%' }}>
                    <LayoutNode
                        layout={row}
                        frame={frame}
                        margin={margin}
                        visitor={visitor}
                        location={[...location, i]}
                        monitor={monitor}
                    />
                </div>
            )
        }

        const className = "flex flex-col h-full " + margin;
        return (
            <div onClick={visitor.generateOnClick({ location, layout, monitor, applicationName: null, windows: null })} className={className}>
                {directionLeader}
                {rows}
            </div>
        );
    }
    else if (layout.type === "stack") {
        return <Window 
            frame={frame} 
            text="Stack" 
            margin={margin} 
            layout={layout} 
            selected={visitor.generateSelected({ location, layout, monitor, applicationName: null, windows: null })}
            onClick={visitor.generateOnClick({ location, layout, monitor, applicationName: null, windows: null })}
            />
    }
    else if (layout.type === "pinned") {
        return <Window 
            frame={frame} 
            text={layout.application || ""} 
            margin={margin} 
            layout={layout} 
            selected={visitor.generateSelected({ location, layout, monitor, applicationName: null, windows: null })}
            onClick={visitor.generateOnClick({ location, layout, monitor, applicationName: null, windows: null })}
        />
    }
    else if (layout.type === "empty") {
        return <Window 
            frame={frame} 
            text="Empty" 
            margin={margin} 
            layout={layout} 
            selected={visitor.generateSelected({ location, layout, monitor, applicationName: null, windows: null })}
            onClick={visitor.generateOnClick({ location, layout, monitor, applicationName: null, windows: null })}
        />
    }

    return (<div>Unknown layout type {JSON.stringify(layout)}</div>);
}

export type RenderScreenSetProps = {
    monitors: Monitor[];
    screenSet: ScreenConfig;
    visitor: NodeVisitor;
}

const ActualWidth = 320;
const ActualHeight = 240;
export function RenderScreenSet({ monitors, screenSet, visitor }: RenderScreenSetProps) {
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
                    visitor={visitor}
                    location={[]}
                    monitor={monitor.name}
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

type RootLayoutProps = {
    layout: WindowManagerLayout;
    monitors: Monitor[];
    visitor: NodeVisitor;
}

export function RenderLayout({ layout, monitors, visitor }: RootLayoutProps) {
    const screenSet = findMatchingScreenSet(layout, monitors);
    if (screenSet) {
        return (
            <div key={layout.name}>
                <div className="flex flex-row items-center justify-center p-1 gap-1">
                    <Key text={layout.quickKey}></Key>
                    <div className="text-xs">{layout.name}</div>
                </div>
                <RenderScreenSet monitors={monitors} screenSet={screenSet} visitor={visitor} />
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