import { useContext, useEffect, useState } from "react"
import { CommandWrapperWithFocus, defaultCommandProps, DefaultCommandProps, useFocus } from "./CommandWrapper"
import React from "react"
import { Key } from "./Key"
import { CommandWrapper } from "./CommandWrapper"

export type Prefix = {
    type: "command"
    packageName: string,
    commandName: string,
    props: any
    description: string
} | {
    type: "quickFunction"
    description: string
    quickFunction: () => void
}

type PrefixMap = { [key: string]: Prefix }

export type PrefixSelectCommandProps = DefaultCommandProps & {
    prefixes: PrefixMap
}

export function PrefixSelectCommand(props: PrefixSelectCommandProps) {
    const { handleExit } = useContext(window.ModalCommanderContext)
    const [selectedKey, setSelectedKey] = useState<string | null>(null)
    const [components, setComponents] = useState<Map<string, React.ComponentType<any>>>(new Map())

    const prefixList = []

    for (const [prefix, { description }] of Object.entries(props.prefixes)) {
        let selectedCSS = ""
        if (prefix === selectedKey) {
            selectedCSS = "bg-gray-200 rounded-lg"
        }
        prefixList.push(
            <div key={prefix} className={`flex flex-row items-center gap-2 ${selectedCSS}`}>
                <Key key={prefix} text={prefix} /> <span className="text-md text-gray-600">{description}</span>
            </div>
        )
    }

    let selectedComponent = null
    let selectedProps = null

    if (selectedKey && components.size > 0) {
        const prefix = props.prefixes[selectedKey]
        if (prefix && prefix.type === "command") {
            selectedComponent = components.get(selectedKey)
            selectedProps = prefix.props
        }
    }
    useEffect(() => {
        if (selectedKey) {
            const prefix = props.prefixes[selectedKey]
            if (prefix && prefix.type === "quickFunction") {
                prefix.quickFunction()
                handleExit();
            }
        }
    }, [selectedKey])

    useEffect(() => {
        const importPromises: Promise<[string, React.ComponentType<any>]>[] = [];
        for (const [prefix, entry] of Object.entries(props.prefixes)) {
            if (entry.type === "command") {
                importPromises.push((async () => {
                    const module = await import(`mc://commands/${entry.packageName}`)
                    return [prefix, module.components[entry.commandName]]
                })())
            }
        }
        Promise.all(importPromises).then((modules) => {
            setComponents(new Map(modules))
        }).catch((error) => {
            console.error(error)
        })
    }, [])

    const [setFocus, wrapper] = CommandWrapperWithFocus({
        ...props,
        keyHandler: (event) => setSelectedKey(event.key),
        inner: <div className="card-body">
            {prefixList}
        </div>,
        next: selectedComponent 
            ? React.createElement(selectedComponent, { index: props.index + 1, handleDelete, ...selectedProps }) 
            : null,
        headerText: "Select",
        testIdPrefix: "prefix-select-command"
    });

    function handleDelete() {
        setSelectedKey(null)
        setFocus(true)
    }

    return (wrapper);
}