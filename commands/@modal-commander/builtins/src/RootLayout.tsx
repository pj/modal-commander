import { Key } from "./Key"
import { Bounds, Layout as BaseLayout, Monitor, SCREEN_PRIMARY, WindowManagerLayout as BaseWindowManagerLayout, ScreenConfig as BaseScreenConfig } from "./WindowManagementTypes"

const columnCss = "rounded-md text-xs bg-white flex flex-col border border-gray-300"
const columnStyle = { fontSize: "0.5rem" }
const SIZE_RATIO = 0.1;

// Extended types that include selection state
type SelectableLayout = BaseLayout & {
    selected?: boolean;
}

type SelectableScreenConfig = {
    [key: string]: SelectableLayout;
}

type SelectableWindowManagerLayout = Omit<BaseWindowManagerLayout, 'screenSets'> & {
    screenSets: SelectableScreenConfig[];
}

type RootLayoutProps = {
    layout: SelectableWindowManagerLayout;
    monitors: Monitor[];
}

type WindowProps = {
    frame: Bounds;
    text: string;
    margin: string;
    selected?: boolean;
}

function Window({ frame, text, margin, selected }: WindowProps) {
    const selectedClass = selected ? "ring-2 ring-blue-500" : "";
    return (
        <div
            style={{ ...columnStyle, width: frame.width * SIZE_RATIO, height: frame.height * SIZE_RATIO }}
            className={`${columnCss} ${margin} ${selectedClass}`}
        >
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

type LayoutProps = {
    layout: SelectableLayout;
    frame: Bounds;
    margin: string;
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
            rows.push(
                <Layout
                    layout={row}
                    frame={{ width: frame.width, height: rowHeight, x: frame.x, y: frame.y }}
                    margin={margin}
                />
            )
        }

        const className = "flex flex-col " + margin;
        return (
            <div className={className}>
                {rows}
            </div>
        );
    }
    else if (layout.type === "stack") {
        return <Window frame={{ width: frame.width, height: frame.height, x: frame.x, y: frame.y }} text="Stack" margin={margin} selected={layout.selected} />
    }
    else if (layout.type === "pinned") {
        return <Window frame={{ width: frame.width, height: frame.height, x: frame.x, y: frame.y }} text={layout.application || ""} margin={margin} selected={layout.selected} />
    }
    else if (layout.type === "empty") {
        return <Window frame={{ width: frame.width, height: frame.height, x: frame.x, y: frame.y }} text="Empty" margin={margin} selected={layout.selected} />
    }

    return (<div>Unknown layout type {JSON.stringify(layout)}</div>);
}

export function RootLayout({ layout, monitors }: RootLayoutProps) {
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
                    <div style={{ width: 160 }} className="flex flex-row items-center justify-center p-1 gap-1">
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
                style={{ width: 160 }}
                className="flex flex-row items-center justify-center p-1 gap-1">
                Unable to find matching screens for layout {layout.name}
            </div>
        </div>
    );
} 