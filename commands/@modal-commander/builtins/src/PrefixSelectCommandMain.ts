export class PrefixSelectCommandMain {
    onStart() {
        console.log('onStart')
    }

    onStop() {
        console.log('onStop')
    }

    onMessage(message: any) {
        console.log('onMessage', message)
    }
}