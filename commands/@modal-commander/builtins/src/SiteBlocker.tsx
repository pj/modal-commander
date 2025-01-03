import { useContext, useEffect, useState } from "react"
import { CommandWrapper, DefaultCommandProps, defaultCommandProps, useFocus } from "./CommandWrapper"
import { Key } from "./Key"

type SiteBlockerState = {
    timeSpent: number
    blocked: boolean
    timeLimit: number
    validTime: boolean
};

export type SiteBlockerCommandProps = DefaultCommandProps

export function SiteBlockerCommand(props: SiteBlockerCommandProps) {
    const { sendMessage, sendInvoke } = useContext(window.ModalCommanderContext)

    // const { wrapperElement, setFocus } = useFocus()
    // const appState = useContext(AppStateContext)

    // const sendMessage = useContext(AppSendMessageContext)
    // const handleExit = useContext(AppExitContext)

    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    // const siteBlockerState = appState.siteBlocker as SiteBlockerState | undefined;
    const [siteBlockerState, setSiteBlockerState] = useState<SiteBlockerState | null>(null)

    const handleVisibilityChange = () => {
        if (!document.hidden) {
            sendInvoke({ command: '@modal-commander/builtins.SiteBlocker', type: 'getState' })
                .then((state: SiteBlockerState) => {
                    setSiteBlockerState(state)
                });
        }
    }

    useEffect(() => {
        sendInvoke({ command: '@modal-commander/builtins.SiteBlocker', type: 'getState' }).then((state: SiteBlockerState) => {
            setSiteBlockerState(state)
        });
        window.addEventListener("visibilitychange", handleVisibilityChange);
        const interval = setInterval(() => {
            sendInvoke({ command: '@modal-commander/builtins.SiteBlocker', type: 'getState' }).then((state: SiteBlockerState) => {
                setSiteBlockerState(state)
            });
        }, 1000);
        return () => {
            window.removeEventListener("visibilitychange", handleVisibilityChange);
            clearInterval(interval);
        }
    }, []);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'b') {
            if (siteBlockerState && !siteBlockerState.validTime) {
                setErrorMessage("Only available between 6pm and 1am")
                return;
            }
            if (siteBlockerState) {
                sendMessage({ type: 'siteBlocker' })
            }
            return;
        }
    }

    const handleToggle = () => {
        sendInvoke({ command: '@modal-commander/builtins.SiteBlocker', type: 'toggle' }).then((state: SiteBlockerState) => {
            setSiteBlockerState(state)
        });
    }

    let secondsLeft = null
    if (siteBlockerState) {
        secondsLeft = Math.ceil(siteBlockerState.timeLimit - siteBlockerState.timeSpent);
    } else {
        secondsLeft = "--";
    }

    // sendMessage({ type: 'log', message: JSON.stringify(appState.siteBlocker) })

    // return (
    //     <div
    //         key={index}
    //         {...defaultCommandProps(index, "site-blocker-command", wrapperElement, setFocus)}
    //         onKeyDown={handleKeyDown}
    //     >
    //         <div className="text-xs text-center text-gray-600">Site Blocker</div>
    //         <hr className="border-gray-300" />
    //         <div className="card-body">
    //             {
    //                 siteBlockerState ? (
    //                     <>
    //                         <div className="form-control">
    //                             <label className="label cursor-pointer flex flex-row items-center gap-2 justify-start">
    //                                 <span className="label-text">Sites Available</span>
    //                                 <Key key="B" text="B" />
    //                                 <input
    //                                     type="checkbox"
    //                                     className="toggle toggle-primary toggle-lg"
    //                                     disabled={!siteBlockerState.validTime}
    //                                     checked={!siteBlockerState.blocked}
    //                                     onChange={() => sendMessage({ type: 'siteBlocker' })}
    //                                 />
    //                             </label>
    //                         </div>
    //                         <div className={`label-text ${!siteBlockerState.validTime || siteBlockerState.blocked ? "text-gray-400" : "text-gray-600"} text-center text-xl`}>
    //                             {secondsLeft} Minutes Left
    //                         </div>
    //                         {errorMessage && <div className="text-xs text-center text-red-500">{errorMessage}</div>}
    //                     </>
    //                 ) : <span data-testid="site-blocker-loading" className="loading loading-bars loading-xl">Loading...</span>
    //             }
    //         </div>
    //     </div>
    // );

    return (
        <CommandWrapper
            {...props}
            keyHandler={handleKeyDown}
            testIdPrefix="site-blocker"
            headerText="Site Blocker"
            inner={
                    siteBlockerState ? (
                        <>
                            <div className="form-control">
                                <label className="label cursor-pointer flex flex-row items-center gap-2 justify-start">
                                    <span className="label-text">Sites Available</span>
                                    <Key key="B" text="B" />
                                    <input
                                        type="checkbox"
                                        className="toggle toggle-primary toggle-lg"
                                        disabled={!siteBlockerState.validTime}
                                        checked={!siteBlockerState.blocked}
                                        onChange={() => sendMessage({ type: 'siteBlocker' })}
                                    />
                                </label>
                            </div>
                            <div className={`label-text ${!siteBlockerState.validTime || siteBlockerState.blocked ? "text-gray-400" : "text-gray-600"} text-center text-xl`}>
                                {secondsLeft} Minutes Left
                            </div>
                            {errorMessage && <div className="text-xs text-center text-red-500">{errorMessage}</div>}
                        </>
                    ) : null
                }
        />
    );
}
