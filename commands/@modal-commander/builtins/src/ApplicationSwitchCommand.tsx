import { useContext, useEffect, useState } from "react"
import { CommandWrapperWithFocus, defaultCommandProps, DefaultCommandProps, useFocus } from "./CommandWrapper"
import React from "react"
import { Key } from "./Key"
import { CommandWrapper } from "./CommandWrapper"

export type ApplicationSwitchCommandProps = DefaultCommandProps & {
    applications: {
        name: string,
        key: string,
    }[]
}

export function ApplicationSwitchCommand(props: ApplicationSwitchCommandProps) {
    const { handleExit, sendInvoke } = useContext(window.ModalCommanderContext)

    const applicationList = []

    for (const application of props.applications) {
        applicationList.push(
        <div key={application.key} className="flex flex-row items-center gap-2">
            <Key key={application.key} text={application.key} /> 
            <span className="text-md text-gray-600">{application.name}</span>
        </div>
        )
    }

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        for (const application of props.applications) {
            if (event.key === application.key) {
                sendInvoke(
                    { command: '@modal-commander/builtins#ApplicationSwitchCommand', application: application.name }
                ).then(() => {
                    handleExit();
                })
                return;
            }
        }
    }

    return (
        <CommandWrapper
            {...props}
            keyHandler={handleKeyDown}
            testIdPrefix="application-switch-command"
            headerText="Switch Application"
            inner={
                <div className="card-body">
                    {applicationList}
                </div>
            }
        />
    );
}