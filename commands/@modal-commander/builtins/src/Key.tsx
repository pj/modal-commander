
export type KeyProps = {
    text: string
}
export function Key(props: KeyProps) {
    return (
        <kbd className="kbd kbd-sm">
            {props.text}
        </kbd>
    )
}