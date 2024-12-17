import React, { useContext, useLayoutEffect, useRef, useState } from "react";

export type DefaultCommandProps = {
    index: number,
    handleDelete: () => void,
}

export type CommandWrapperProps = DefaultCommandProps & {
    testIdPrefix: string,
    headerText: string,
    inner: React.ReactNode | null,
    next?: React.ReactNode | null
    keyHandler?: (event: React.KeyboardEvent<HTMLDivElement>) => void
}

type Focus = {
    wrapperElement: React.RefObject<HTMLDivElement>,
    focus: boolean,
    setFocus: (focus: boolean) => void
}

export function useFocus(): Focus {
    const wrapperElement = useRef<HTMLDivElement>(null);
    const [focus, setFocus] = useState(true)

    useLayoutEffect(() => {
        if (focus) {
            wrapperElement.current?.focus();
        } else {
            wrapperElement.current?.blur();
        }
    }, [focus]);

    return { wrapperElement, focus, setFocus }
}

export function defaultCommandProps(index: number, testId: string, wrapperElement: React.RefObject<HTMLDivElement>, setFocus: (focus: boolean) => void) {
    return {
        tabIndex: index,
        ref: wrapperElement,
        "data-testid": testId + '-' + index,
        className: "card card-bordered bg-white shadow-md border-gray-300 focus:outline-none focus:ring focus:ring-light-blue-200",
        onClick: (event: React.MouseEvent<HTMLDivElement>) => {
            if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) {
                return; // Let the input handle the event naturally
            }
            setFocus(true)
        },
        onBlur: () => setFocus(false)
    }
}

export function CommandHeader(props: { text: string }) {
    return <div className="text-xs text-center text-gray-600 bg-sky-100 rounded-t-lg">{props.text}</div>
}

export function CommandWrapper(props: CommandWrapperProps) {
    const [_, wrapper] = CommandWrapperWithFocus(props)
    return wrapper
}

export function CommandWrapperWithFocus(props: CommandWrapperProps): [(focus: boolean) => void, JSX.Element] {
    const { wrapperElement, setFocus } = useFocus()
    const { handleExit } = useContext(window.ModalCommanderContext)

    function keyHandler(event: React.KeyboardEvent<HTMLDivElement>) {
        event.preventDefault()
        if (event.key === 'Escape') {
            handleExit();
            return;
        }
        if (event.key === 'Backspace') {
            props.handleDelete();
            return;
        }
        if (props.keyHandler) {
            props.keyHandler(event)
        }
    }

    return [
        setFocus,
        <>
            <div
                key={props.index}
                {...defaultCommandProps(props.index, props.testIdPrefix, wrapperElement, setFocus)}
                onKeyDown={keyHandler}
            >
                <CommandHeader text={props.headerText} />
                {
                    props.inner
                        ? props.inner
                        : <span data-testid={props.testIdPrefix + "-loading"} className="loading loading-bars loading-xl">Loading...</span>
                }
            </div>
            {props.next}
        </>
    ];
}