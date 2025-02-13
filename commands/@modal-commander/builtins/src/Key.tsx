
export type KeyProps = {
    text: string
    selected?: boolean
    size?: "xs" | "sm" | "md" | "lg"
}
export function Key(props: KeyProps) {
    let selectedCSS = ""
    if (props.selected) {
        selectedCSS = "bg-gray-200"
    }
    return (
        <kbd className={`kbd ${selectedCSS} ${props.size ? `kbd-${props.size}` : ""}`}>
            {props.text}
        </kbd>
    )
}