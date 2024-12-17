import { useContext } from "react"
import { Key } from "./Key"
import { CommandWrapper, DefaultCommandProps } from "./CommandWrapper"

export type LockCommandProps = DefaultCommandProps

export function LockCommand(props: LockCommandProps) {
    const { sendMessage, handleExit } = useContext(window.ModalCommanderContext)

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        console.log('handleKeyDown', event)
        if (event.key === 'l') {
            sendMessage({ command: '@modal-commander.builtins.LockCommand' });
            handleExit();
            return;
        }
    }

    return (
        <CommandWrapper
            {...props}
            keyHandler={handleKeyDown}
            testIdPrefix="lock-command"
            headerText="Lock Screen"
            inner={
                <div className="form-control">
                    <label className="label cursor-pointer flex flex-row items-center gap-3 justify-start">
                        <Key key="L" text="L" />
                        <button
                            className="btn btn-primary btn-xl"
                            data-testid={"lock-command-button"}
                            onClick={() => {
                                sendMessage({ type: 'lockScreen' });
                                handleExit();
                            }}
                        >
                            Lock Screen
                        </button>
                    </label>
                </div>
            }
        />
    );
}