import { z } from 'zod';

export const LayoutType = z.enum(["stack", "empty", "pinned", "rows", "columns", "float_zoomed"]);
export type LayoutType = z.infer<typeof LayoutType>;

export const SCREEN_PRIMARY = "$PRIMARY";
export const PERCENTAGE_INCREMENT = 10;

const BaseLayout = z.object({
  type: LayoutType,
  percentage: z.number().optional(),
});

export const StackLayout = BaseLayout.extend({
  type: z.literal("stack"),
});

export const EmptyLayout = BaseLayout.extend({
  type: z.literal("empty"),
});

export const PinnedLayout = BaseLayout.extend({
  type: z.literal("pinned"),
  application: z.string(),
  title: z.string().optional(),
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
  application: z.string(),
  title: z.string().optional(),
});

export const Layout = z.discriminatedUnion("type", [
  StackLayout,
  EmptyLayout,
  PinnedLayout,
  RowsLayout,
  ColumnsLayout,
  FloatZoomedLayout,
]);

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

export const Monitor = z.object({
  id: z.number(),
  name: z.string(),
  bounds: Bounds,
  main: z.boolean(),
});

export const ScreenConfig = z.record(z.string(), Layout);

export const WindowManagerLayout = z.object({
  screenSets: z.array(ScreenConfig).optional(),
  floats: z.array(FloatZoomedLayout).optional(),
  zoomed: z.array(FloatZoomedLayout).optional(),
});

export const WindowManagerState = z.object({
  monitors: z.array(Monitor),
  windows: z.array(Window),
  currentLayout: WindowManagerLayout,
});

// Type exports
export type Bounds = z.infer<typeof Bounds>;
export type Layout = z.infer<typeof Layout>;
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
