import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { LockCommand } from './commands/LockCommand'
import { Prefix, PrefixSelectCommand } from './commands/PrefixSelectCommand'
import { SiteBlockerCommand } from './commands/SiteBlocker'
import { VolumeCommand } from './commands/VolumeCommand'
import './index.css'
import { SelectLayoutCommand } from './window_management/SelectLayoutCommand'
// export function sendMessage(message: any) {
//   // @ts-ignore
//   webkit.messageHandlers.wmui.postMessage(message)
// }


createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <button onClick={async () => {
            console.log('clicked')
            const url = new URL('mc://modal-commander.net/test');
            // @ts-ignore
            await import(url);
        }}>click me</button>
        <div>hello html world</div>
        {/* <App
            sendMessage={sendMessage}
            RootCommand={PrefixSelectCommand}
            RootCommandProps={{
                prefixes: new Map<string, Prefix>([
                    [
                        'b', 
                        {component: SiteBlockerCommand, props: {}, description: 'Site Blocker', type: "command"}
                    ],
                    // [
                    //     'w', 
                    //     {component: EditLayoutCommand, props: {}, description: 'Window Management editor', type: "command"}
                    // ],
                    [
                        'l', 
                        {component: SelectLayoutCommand, props: {}, description: 'Select Layout', type: "command"}
                    ],
                    [
                        'o', 
                        {component: LockCommand, props: {}, description: 'Lock Screen', type: "command"}
                    ],
                    [
                        'v', 
                        {component: VolumeCommand, props: {}, description: 'Volume', type: "command"}
                    ],
                    // [
                    //     'z', 
                    //     {
                    //         quickFunction: () => {
                    //             sendMessage({ type: "windowManagementZoomToggle" })
                    //         }, 
                    //         description: 'Toggle Zoom of focused window', 
                    //         type: "quickFunction"
                    //     }
                    // ],
                    // [
                    //     'f', 
                    //     {
                    //         quickFunction: () => {
                    //             sendMessage({ type: "windowManagementFloatToggle" })
                    //         }, 
                    //         description: 'Make focused window float', 
                    //         type: "quickFunction"
                    //     }
                    // ],
                ]),
                index: 0,
                handleDelete: () => {}
            }}
            setMessageListener={listener => window.addEventListener('message', listener)}
            removeMessageListener={listener => window.removeEventListener('message', listener)}
            debug={false}
        /> */}
    </StrictMode>,
)
