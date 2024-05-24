import { call } from './utils'

export const useDefer = () => {
    const defered: (() => void)[] = []
    return {
        defer: (fn: () => void) => defered.push(fn),
        runDefered: () => defered.forEach(call)
    }
}
