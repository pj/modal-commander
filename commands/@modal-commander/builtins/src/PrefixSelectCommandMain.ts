export class PrefixSelectCommandMain {
    onStart() {
    }

    onStop() {
        console.log('onStop')
    }

    onMessage(message: any) {
        console.log('onMessage', message)
    }
}