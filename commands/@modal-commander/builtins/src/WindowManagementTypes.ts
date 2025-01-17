export type LayoutType = "stack" | "empty" | "pinned" | "rows" | "columns" | "float_zoomed"

export const SCREEN_PRIMARY = "$PRIMARY";
export const PERCENTAGE_INCREMENT = 10;

export interface BaseLayout {
    type: LayoutType;
    percentage?: number;
}

export interface StackLayout extends BaseLayout {
    type: "stack";
}

export interface EmptyLayout extends BaseLayout {
    type: "empty";
}

export interface PinnedLayout extends BaseLayout {
    type: "pinned";
    application: string;
    title?: string;
}

export interface RowsLayout extends BaseLayout {
    type: "rows";
    rows: Layout[];
}

export interface ColumnsLayout extends BaseLayout {
    type: "columns";
    columns: Layout[];
}

export interface FloatZoomedLayout extends BaseLayout {
    type: "float_zoomed";
    application: string;
    title?: string;
}

export type Layout = StackLayout | EmptyLayout | PinnedLayout | RowsLayout | ColumnsLayout | FloatZoomedLayout;

export type WindowManagerState = {
    monitors: Map<string, Monitor>;
    windows: Map<number, Window>;
    currentLayout: WindowManagerLayout;
}

export interface ScreenConfig {
    [screenName: string]: Layout;
}

export interface WindowManagerLayout {
    screens?: ScreenConfig[];
    floats?: FloatZoomedLayout[];
    zoomed?: FloatZoomedLayout[];
}

export interface Window {
    id: number;
    title: string;
    application: string;
    bounds: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}

export interface Monitor {
    id: number;
    name: string;
    bounds: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    main: boolean;
}
