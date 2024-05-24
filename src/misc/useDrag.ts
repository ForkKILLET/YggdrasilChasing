import { ref, Ref } from 'vue'
import { useEventListener } from '@vueuse/core'

export default <T = undefined>(el: Ref<HTMLElement | undefined>, opts: {
    onStart: (event: MouseEvent) => T
    onMove: (event: MouseEvent, dragData: T) => T
    onEnd?: (event: MouseEvent, dragData: T) => T
}) => {
    const dragEnabled = ref(true)
    const isDragging = ref(false)
    let dragData: T | null = null
    useEventListener(el, 'mousedown', (ev) => {
        if (! dragEnabled.value) return
        isDragging.value = true
        dragData = opts.onStart(ev)
    })
    useEventListener(el, 'mousemove', (ev) => {
        if (! dragEnabled.value) return
        if (isDragging.value) {
            dragData = opts.onMove(ev, dragData!)
        }
    })
    useEventListener(window, 'mouseup', (ev) => {
        if (! dragEnabled.value) return
        if (isDragging.value) {
            isDragging.value = false
            void (opts.onEnd ?? opts.onMove)(ev, dragData!)
        }
    })
    return {
        dragEnabled, isDragging
    }
}
