export type CommandProps<T> = {
    command: T
}

export type Renderer<Props> = {
    component: React.ComponentType<Props>
}

export type RequestWrapper<T> = {
    request: T
}

export type Main = {
    handle: (event: MessageEvent) => void
}