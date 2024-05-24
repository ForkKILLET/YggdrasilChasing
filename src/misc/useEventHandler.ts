import { MaybeRefOrGetter, useEventListener } from '@vueuse/core'


export default <E extends keyof HTMLElementEventMap>(event: E) => {
    type Handler = (ev: Ev) => void
    type Ev = HTMLElementEventMap[E]

    return (
        el: MaybeRefOrGetter<EventTarget | undefined | null>,
        opts: {
            onHandlerSet?: (fn: Handler) => void,
            onHandlerClear?: () => void,
        } = {}
    ) => {
        let handler: Handler | null = null
        useEventListener(el, event, (ev: Ev) => {
            if (! handler) return
            ev.stopImmediatePropagation()
            handler(ev)
        }, { capture: true })
        return {
            setHandler: (newHandler: Handler) => {
                handler = newHandler
                opts.onHandlerSet?.(newHandler)
            },
            waitHandler: <T>(newHandler: (ev: Ev) => T) => new Promise<T>(resolve => {
                handler = (ev) => resolve(newHandler(ev))
                opts.onHandlerSet?.(newHandler)
            }),
            clearHandler: () => {
                handler = null
                opts.onHandlerClear?.()
            }
        }
    }
}
