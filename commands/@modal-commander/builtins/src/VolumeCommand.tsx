import { useContext, useEffect, useState } from "react"
import { CommandWrapper, DefaultCommandProps, defaultCommandProps, useFocus } from "./CommandWrapper"
import { Key } from "./Key"

type VolumeState = {
    muted: boolean
    volume: number
};

export type VolumeCommandProps = DefaultCommandProps

export function VolumeCommand(props: VolumeCommandProps) {
    // const { wrapperElement, setFocus } = useFocus()
    // const appState = useContext(AppStateContext)

    // const sendMessage = useContext(AppSendMessageContext)
    // const handleExit = useContext(AppExitContext)

    // const [errorMessage, setErrorMessage] = useState<string | null>(null)

    // const volumeState = appState.volume as VolumeState | undefined;
    const { sendMessage, sendInvoke } = useContext(window.ModalCommanderContext)
    // const { wrapperElement, setFocus } = useFocus()
    // const appState = useContext(AppStateContext)

    // const sendMessage = useContext(AppSendMessageContext)
    // const handleExit = useContext(AppExitContext)

    // const [errorMessage, setErrorMessage] = useState<string | null>(null)

    // const siteBlockerState = appState.siteBlocker as SiteBlockerState | undefined;
    const [volumeState, setVolumeState] = useState<VolumeState | null>(null)

    const handleVisibilityChange = () => {
        if (!document.hidden) {
            sendInvoke({ command: '@modal-commander/builtins#VolumeCommand', type: 'getState' })
                .then((state: VolumeState) => {
                    setVolumeState(state)
                });
        }
    }

    useEffect(() => {
        sendInvoke({ command: '@modal-commander/builtins#VolumeCommand', type: 'getState' }).then((state: VolumeState) => {
            setVolumeState(state)
        });
        window.addEventListener("visibilitychange", handleVisibilityChange);
        const interval = setInterval(() => {
            sendInvoke({ command: '@modal-commander/builtins#VolumeCommand', type: 'getState' }).then((state: VolumeState) => {
                setVolumeState(state)
            });
        }, 1000);
        return () => {
            window.removeEventListener("visibilitychange", handleVisibilityChange);
            clearInterval(interval);
        }
    }, []);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'm') {
            if (volumeState) {
                sendInvoke({ command: '@modal-commander/builtins#VolumeCommand', type: 'mute' })
                    .then(() => {
                        sendMessage({ command: 'hide' })
                    });
            }
            return;
        }
        if (event.key === 'u') {
            if (volumeState) {
                sendInvoke({ command: '@modal-commander/builtins#VolumeCommand', type: 'up' })
                    .then((volumeState: VolumeState) => {
                        setVolumeState(volumeState)
                    });
            }
            return;
        }
        if (event.key === 'd') {
            if (volumeState) {
                sendInvoke({ command: '@modal-commander/builtins#VolumeCommand', type: 'down' })
                    .then((volumeState: VolumeState) => {
                        setVolumeState(volumeState)
                    });
            }
            return;
        }
    }

    return (
        <CommandWrapper
            {...props}
            keyHandler={handleKeyDown}
            testIdPrefix="volume"
            headerText="Volume"
            inner={
                volumeState ? (
                    <>
                        <div className="form-control">
                            <label className="label cursor-pointer flex flex-row items-center gap-2 justify-start">
                                <Key key="M" text="M" />
                                <span className="label-text">Mute</span>
                                <input
                                    type="checkbox"
                                    className="toggle toggle-primary toggle-lg"
                                    checked={volumeState.muted}
                                    onChange={() => sendMessage({ type: 'volumeMute' })}
                                />
                            </label>
                        </div>

                        <div className="flex flex-row items-center gap-2 justify-start">
                            <Key key="D" text="D" />
                            <button
                                className="btn btn-sm "
                                data-testid={"volume-down-" + props.index}
                                disabled={volumeState.muted}
                                onClick={() => sendMessage({ type: 'volumeDown' })}
                            >
                                -</button>
                            <input
                                className={`range range-primary range-lg ${volumeState.muted ? "[--range-shdw:gray]" : ""}`}
                                min="0"
                                max="100"
                                value={volumeState.volume}
                                disabled={volumeState.muted}
                                type="range"
                                onChange={(event) => sendMessage({ type: 'volumeSet', volume: parseInt(event.target.value) })}
                            />
                            <button
                                className="btn btn-sm"
                                data-testid={"volume-up-" + props.index}
                                disabled={volumeState.muted}
                                onClick={() => sendMessage({ type: 'volumeUp' })}
                            >
                                +</button>
                            <Key key="U" text="U" />
                        </div>
                        {/* {errorMessage && <div className="text-xs text-center text-red-500">{errorMessage}</div>} */}
                    </>
                ) : null
            }
        />
    );

    // return (
    //     <div
    //         key={index}
    //         {...defaultCommandProps(index, "volume-command", wrapperElement, setFocus)}
    //         onKeyDown={handleKeyDown}
    //     >
    //         <div className="text-xs text-center text-gray-600">Volume</div>
    //         <hr className="border-gray-300" />
    //         <div className="card-body">
    //             {
    //                 volumeState ? (
    //                     <>
    //                         <div className="form-control">
    //                             <label className="label cursor-pointer flex flex-row items-center gap-2 justify-start">
    //                                 <Key key="M" text="M" />
    //                                 <span className="label-text">Mute</span>
    //                                 <input
    //                                     type="checkbox"
    //                                     className="toggle toggle-primary toggle-lg"
    //                                     checked={volumeState.muted}
    //                                     onChange={() => sendMessage({ type: 'volumeMute' })}
    //                                 />
    //                             </label>
    //                         </div>

    //                         <div className="flex flex-row items-center gap-2 justify-start">
    //                             <Key key="D" text="D" />
    //                             <button
    //                                 className="btn btn-sm "
    //                                 data-testid={"volume-down-" + index}
    //                                 disabled={volumeState.muted}
    //                                 onClick={() => sendMessage({ type: 'volumeDown' })}
    //                             >
    //                                 -</button>
    //                             <input
    //                                 className={`range range-primary range-lg ${volumeState.muted ? "[--range-shdw:gray]" : ""}`}
    //                                 min="0"
    //                                 max="100"
    //                                 value={volumeState.volume}
    //                                 disabled={volumeState.muted}
    //                                 type="range"
    //                                 onChange={(event) => sendMessage({ type: 'volumeSet', volume: parseInt(event.target.value) })}
    //                             />
    //                             <button
    //                                 className="btn btn-sm"
    //                                 data-testid={"volume-up-" + index}
    //                                 disabled={volumeState.muted}
    //                                 onClick={() => sendMessage({ type: 'volumeUp' })}
    //                             >
    //                                 +</button>
    //                             <Key key="U" text="U" />
    //                         </div>
    //                         {/* {errorMessage && <div className="text-xs text-center text-red-500">{errorMessage}</div>} */}
    //                     </>
    //                 ) : <span data-testid="volume-loading" className="loading loading-bars loading-xl">Loading...</span>
    //             }
    //         </div>
    //     </div>
    // );
}
