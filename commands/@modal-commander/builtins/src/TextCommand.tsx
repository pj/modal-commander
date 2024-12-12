import { CommandHeader, CommandWrapper, defaultCommandProps, DefaultCommandProps, useFocus } from "./CommandWrapper";

export type NullCommandProps = DefaultCommandProps & {
    text: string
}

export function TextCommand(props: NullCommandProps) {
    return (
        <CommandWrapper
            {...props}
            testIdPrefix="text-command"
            headerText="asdf"
            inner={<div className="card-body">{props.text}</div>}
            next={null}
            keyHandler={() => {}}
        />
    );
}