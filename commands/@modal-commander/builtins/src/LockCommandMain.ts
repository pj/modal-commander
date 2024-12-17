import log from "electron-log";

export class LockCommandMain {
    onStart() {
        console.log('onStart')
    }

    onStop() {
        console.log('onStop')
    }

    onMessage(message: any) {
        log.silly('locking screen');
    }
}