
export type KeyProps = {
    text: string
    selected?: boolean
}
export function Key(props: KeyProps) {
    let selectedCSS = ""
    if (props.selected) {
        selectedCSS = "bg-gray-200"
    }
    return (
        <kbd className={`kbd ${selectedCSS}`}>
            {props.text}
        </kbd>
    )
}