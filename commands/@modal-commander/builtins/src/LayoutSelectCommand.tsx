import { useCallback, useEffect, useContext, useState } from "react"
import { CommandWrapper, DefaultCommandProps, useMainState } from "./CommandWrapper"
import { FrontendState } from "./WindowManagementTypes"
import { DefaultVisitor, RenderScreenSet } from "./RootLayout"
import { Key } from "./Key"
import { findMatchingScreenSet } from "./WindowManagerUtils"

export type LayoutCommandProps = DefaultCommandProps

export function LayoutSelectCommand(props: LayoutCommandProps) {
    const { sendInvoke, sendMessage } = useContext(window.ModalCommanderContext)
    const windowManagementState = useMainState<FrontendState>('@modal-commander/builtins#LayoutSelectCommand')

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        for (const layout of windowManagementState?.layouts || []) {
            if (layout.quickKey === event.key) {
                sendInvoke({
                    command: '@modal-commander/builtins#LayoutSelectCommand',
                    type: 'setLayout',
                    quickKey: layout.quickKey
                });
                sendMessage({ command: "hide" });
                return;
            }
        }
    }
    const layouts = [];
    if (windowManagementState) {
        for (const [index, layout] of (windowManagementState?.layouts || []).entries()) {
            const screenSet = findMatchingScreenSet(layout, windowManagementState.monitors);
            if (screenSet) {
                const marginRight = index === (windowManagementState?.layouts || []).length - 1 ? "" : "pr-2";
                const marginLeft = index === 0 ? "" : "pl-2";
                const borderRight = index === (windowManagementState?.layouts || []).length - 1 ? "" : "border-r border-gray-300";
                layouts.push(
                    <div
                        key={layout.name}
                        className={`${marginLeft} ${marginRight} ${borderRight}`}
                    >
                        <div className="flex flex-row items-center justify-center p-1">
                            <Key text={layout.quickKey} size="xs"></Key>
                            <div className="text-xs">{layout.name}</div>
                        </div>
                        <RenderScreenSet
                            monitors={windowManagementState.monitors}
                            screenSet={screenSet}
                            visitor={DefaultVisitor}
                            layoutWidth={240}
                            layoutHeight={180}
                        />
                    </div>
                );
            } else {
                layouts.push(
                    <div key={layout.name}>
                        <div
                            style={{ width: 160 }}
                            className="flex flex-row items-center justify-center p-1 gap-1">
                            Unable to find matching screens for layout {layout.name}
                        </div>
                    </div>
                );
            }
        }
        return (
            <CommandWrapper
                {...props}
                keyHandler={handleKeyDown}
                testIdPrefix="layout-select"
                headerText="Layout Select"
                inner={
                    windowManagementState ? (
                        <div className="card-body flex flex-row items-center justify-center gap-0">
                            {layouts}
                        </div>
                    ) : null
                }
            />
        );
    }
}
