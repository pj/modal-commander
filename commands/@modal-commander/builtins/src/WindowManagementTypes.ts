import { z } from 'zod';

export const LayoutType = z.enum(["stack", "empty", "pinned", "rows", "columns", "float_zoomed"]);
export type LayoutType = z.infer<typeof LayoutType>;

export const SCREEN_PRIMARY = "$PRIMARY";
export const PERCENTAGE_INCREMENT = 10;

export const Bounds = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});

export const Window = z.object({
  id: z.number(),
  title: z.string(),
  application: z.string(),
  bounds: Bounds,
});

const BaseLayout = z.object({
  type: LayoutType,
  percentage: z.number(),
  attachment: z.any().optional(),
});

export const StackLayout = BaseLayout.extend({
  type: z.literal("stack"),
  computed: z.array(Window).optional(),
  // Windows that are specifically stacked on this layout, otherwise they are stacked on the main screen.
  windows: z.lazy((): any => z.array(PinnedLayout) as any),
});

export const EmptyLayout = BaseLayout.extend({
  type: z.literal("empty"),
});

export const PinnedLayout = BaseLayout.extend({
  type: z.literal("pinned"),
  application: z.string(),
  title: z.string().optional(),
  id: z.number().optional(),
  computed: z.array(Window).optional(),
});

export const RowsLayout = BaseLayout.extend({
  type: z.literal("rows"),
  rows: z.lazy((): any => Layout.array() as any),
});

export const ColumnsLayout = BaseLayout.extend({
  type: z.literal("columns"),
  columns: z.lazy((): any => Layout.array() as any),
});

export const FloatZoomedLayout = BaseLayout.extend({
  type: z.literal("float_zoomed"),
  layout: z.lazy((): any => Layout as any),
  floats: z.array(PinnedLayout).optional(),
  zoomed: z.array(PinnedLayout).optional(),
  computed_floats: z.array(Window).optional(),
  computed_zoomed: z.array(Window).optional(),
});

export const Layout = z.discriminatedUnion("type", [
  StackLayout,
  EmptyLayout,
  PinnedLayout,
  RowsLayout,
  ColumnsLayout,
  FloatZoomedLayout,
]);

export const Monitor = z.object({
  id: z.number(),
  name: z.string(),
  bounds: Bounds,
  main: z.boolean(),
});

export const ScreenConfig = z.record(z.string(), Layout);

export const WindowManagerLayout = z.object({
  name: z.string(),
  quickKey: z.string(),
  screenSets: z.array(ScreenConfig),
});

export const Application = z.object({
  name: z.string(),
  pid: z.number(),
  bundleId: z.string(),
  windows: z.array(Window).optional(),
  focusedWindow: Window.optional(),
});

export const WindowManagerState = z.object({
  monitors: z.array(Monitor),
  windows: z.array(Window),
  currentLayout: ScreenConfig.nullable(),
  currentApplication: Application.optional(),
});

export const FrontendState = WindowManagerState.extend({
  layouts: z.array(WindowManagerLayout),
});

// Type exports
export type Bounds = z.infer<typeof Bounds>;
export type Layout = z.infer<typeof Layout>
export type StackLayout = z.infer<typeof StackLayout>;
export type EmptyLayout = z.infer<typeof EmptyLayout>;
export type PinnedLayout = z.infer<typeof PinnedLayout>;
export type RowsLayout = z.infer<typeof RowsLayout>;
export type ColumnsLayout = z.infer<typeof ColumnsLayout>;
export type FloatZoomedLayout = z.infer<typeof FloatZoomedLayout>;
export type Window = z.infer<typeof Window>;
export type Monitor = z.infer<typeof Monitor>;
export type ScreenConfig = z.infer<typeof ScreenConfig>;
export type WindowManagerLayout = z.infer<typeof WindowManagerLayout>;
export type WindowManagerState = z.infer<typeof WindowManagerState>;
export type FrontendState = z.infer<typeof FrontendState>;
export type Application = z.infer<typeof Application>;

export type VisitDetails = {
    location: number[];
    layout: Layout;
    monitor: string;
    applicationName: string | null;
    windows: number[] | null;
}
