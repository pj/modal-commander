import { useCallback, useContext, useEffect, useState } from "react"
import { CommandWrapper, DefaultCommandProps, defaultCommandProps, useFocus } from "./CommandWrapper"
import { Key } from "./Key"

type VolumeState = {
    muted: boolean
    volume: number
};

export type VolumeCommandProps = DefaultCommandProps

export function VolumeCommand(props: VolumeCommandProps) {
    const { sendMessage, sendInvoke } = useContext(window.ModalCommanderContext)
    const [volumeState, setVolumeState] = useState<VolumeState>({
        muted: false,
        volume: 0
    })
    console.log('volumeState', volumeState)

    const getVolumeState = useCallback(() => {
        sendInvoke({ command: '@modal-commander/builtins#VolumeCommand', type: 'getState' }).then((state: VolumeState) => {
            setVolumeState(state)
        });
    }, [sendInvoke])

    const updateVolumeState = useCallback((state: VolumeState) => {
        setVolumeState(state)
        sendInvoke({ command: '@modal-commander/builtins#VolumeCommand', type: 'updateState', state: state })
    }, [setVolumeState])

    const handleVisibilityChange = () => {
        if (!document.hidden) {
            getVolumeState()
        }
    }

    useEffect(() => {
        getVolumeState()
        window.addEventListener("visibilitychange", handleVisibilityChange);
        const interval = setInterval(() => {
            getVolumeState();
        }, 10000);
        return () => {
            window.removeEventListener("visibilitychange", handleVisibilityChange);
            clearInterval(interval);
        }
    }, []);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        console.log('handleKeyDown', event.key)
        if (event.key === 'm') {
            if (volumeState) {
                updateVolumeState({...volumeState, muted: !volumeState.muted})
                sendMessage({ command: 'hide' })
            }
            return;
        }
        if (event.key === 'u') {
            updateVolumeState({...volumeState, volume: volumeState.volume + 5})
            return;
        }
        if (event.key === 'd') {
            updateVolumeState({...volumeState, volume: volumeState.volume - 5})
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
                    <div className="card-body">
                        <div className="form-control">
                            <label className="label cursor-pointer flex flex-row items-center gap-2 justify-start">
                                <Key key="M" text="M" />
                                <span className="label-text">Mute</span>
                                <input
                                    type="checkbox"
                                    className="toggle toggle-primary toggle-lg"
                                    checked={volumeState.muted}
                                    onChange={() => {
                                        updateVolumeState({...volumeState, muted: !volumeState.muted})
                                    }}
                                />
                            </label>
                        </div>

                        <div className="flex flex-row items-center gap-2 justify-start">
                            <Key key="D" text="D" />
                            <button
                                className="btn btn-sm "
                                data-testid={"volume-down-" + props.index}
                                disabled={volumeState.muted}
                                onClick={() => updateVolumeState({...volumeState, volume: volumeState.volume - 5})}
                            >
                                -</button>
                            <input
                                className={`range range-primary range-lg ${volumeState.muted ? "[--range-shdw:gray]" : ""}`}
                                min="0"
                                max="100"
                                value={volumeState.volume}
                                disabled={volumeState.muted}
                                type="range"
                                onChange={(event) => updateVolumeState({...volumeState, volume: parseInt(event.target.value)})}
                            />
                            <button
                                className="btn btn-sm"
                                data-testid={"volume-up-" + props.index}
                                disabled={volumeState.muted}
                                onClick={() => updateVolumeState({...volumeState, volume: volumeState.volume + 5})}
                            >
                                +</button>
                            <Key key="U" text="U" />
                        </div>
                        {/* {errorMessage && <div className="text-xs text-center text-red-500">{errorMessage}</div>} */}
                    </div>
                ) : null
            }
        />
    );
}
