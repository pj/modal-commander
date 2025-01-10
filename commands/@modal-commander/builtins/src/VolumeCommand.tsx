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

    const volumeMessage = useCallback((type: string, volume?: number) => {
        const message = {
            command: '@modal-commander/builtins#VolumeCommand',
            type: type,
        } as any;
        if (volume) {
            message.volume = volume
            setVolumeState({muted: volumeState.muted, volume: volume})
        }
        sendInvoke(message).then((state: VolumeState) => {
            setVolumeState({...volumeState, volume: state.volume})
        });
    }, [sendInvoke])

    const handleVisibilityChange = () => {
        if (!document.hidden) {
            volumeMessage('getState')
        }
    }

    useEffect(() => {
        volumeMessage('getState')
        window.addEventListener("visibilitychange", handleVisibilityChange);
        const interval = setInterval(() => {
            volumeMessage('getState');
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
                setVolumeState({...volumeState, muted: !volumeState.muted})
                sendInvoke({ command: '@modal-commander/builtins#VolumeCommand', type: 'mute', muted: !volumeState.muted })
                    .then(() => {
                        sendMessage({ command: 'hide' })
                    });
            }
            return;
        }
        if (event.key === 'u') {
            volumeMessage('up')
            return;
        }
        if (event.key === 'd') {
            volumeMessage('down')
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
                                    onChange={() => {
                                        setVolumeState({...volumeState, muted: !volumeState.muted})
                                        sendInvoke({ command: '@modal-commander/builtins#VolumeCommand', type: 'mute', muted: !volumeState.muted })
                                            .then((state: VolumeState) => {
                                                setVolumeState({...volumeState, ...state})
                                            });
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
                                onClick={() => volumeMessage('down')}
                            >
                                -</button>
                            <input
                                className={`range range-primary range-lg ${volumeState.muted ? "[--range-shdw:gray]" : ""}`}
                                min="0"
                                max="100"
                                value={volumeState.volume}
                                disabled={volumeState.muted}
                                type="range"
                                onChange={(event) => volumeMessage('set', parseInt(event.target.value))}
                            />
                            <button
                                className="btn btn-sm"
                                data-testid={"volume-up-" + props.index}
                                disabled={volumeState.muted}
                                onClick={() => volumeMessage('up')}
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
}
