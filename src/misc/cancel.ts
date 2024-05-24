import { call } from './utils'

export class CancelError extends Error {
    constructor() { super('cancelled') }
}

export const useCancel = () => {
    const cancelListeners: (() => void)[] = []
    
    return {
        cancel: () => cancelListeners.forEach(call),
        cancellable: <T>(promise: Promise<T>) => new Promise<T>((resolve, reject) => {
            cancelListeners.push(() => reject(new CancelError))
            promise.then(resolve, reject)
        })
    }
}
    
