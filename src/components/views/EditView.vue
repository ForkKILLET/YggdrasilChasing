<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useEventListener } from '@vueuse/core'

import SvgWrapper from '../SvgWrapper.vue'

import {
    entities, addEntity, addEntities, newDot, newLineE, UNIQUE_IDS,
    nextId, entityRenders, removeEntityById,
    entitiesSorted
} from '../../stores/entities'
import useDrag from '../../misc/useDrag'
import useEventHandler from '../../misc/useEventHandler'
import { call, deleteBy, randomColor } from '../../misc/utils'
import { Point } from '../../types/common'
import { Disposable } from '../../types/disposable'
import { boardOpts, boardViewBox as vb } from '../../stores/board' 
import { CancelError, useCancel } from '../../misc/cancel'
import { useDefer } from '../../misc/defer'

const boardEl = ref<HTMLDivElement>()

const { dragEnabled } = useDrag<{
    x0: number,
    y0: number
}>(boardEl, {
    onStart: ({ clientX: x0, clientY: y0 }) => ({ x0, y0 }),
    onMove: ({ clientX: x, clientY: y }, { x0, y0 }) => {
        vb.x += (x0 - x) * vb.s
        vb.y += (y0 - y) * vb.s
        return { x0: x, y0: y }
    }
})

useEventListener(boardEl, 'wheel', (ev) => {
    const d = ev.deltaY
    if (! d) return
    if (d > 0 && vb.s < 3) vb.s += 0.1
    else if (d < 0 && vb.s > 0.2) vb.s -= 0.3
})

const useClickHandler = useEventHandler('click')
const { waitHandler: waitClick, clearHandler: clearClick } = useClickHandler(boardEl, {
    onHandlerClear: () => { dragEnabled.value = true },
    onHandlerSet: () => { dragEnabled.value = false }
})

const useMoveHandler = useEventHandler('mousemove')
const { setHandler: setMove, clearHandler: clearMove } = useMoveHandler(window)

useEventListener(window, 'keydown', (ev) => {
    if (ev.key === 'Escape') {
        const name = currTask.value
        if (name) tasks[name].cancel()
    }
    else if (ev.key === 'l') tasks.addLine.action()
})

const getPointer = (ev: MouseEvent): Point => {
    const { clientX, clientY } = ev
    const { left, top, width, height } = boardEl.value!.getBoundingClientRect()
    return {
        x: (clientX - left) / width * boardOpts.width * vb.s + vb.x,
        y: (clientY - top) / height * boardOpts.height * vb.s + vb.y
    }
}

const paintMouse = (ev: MouseEvent) => {
    const { x, y } = getPointer(ev)!
    addEntity(newDot(x, y, { id: UNIQUE_IDS.mouse }))
}

const clearMouse = () => {
    deleteBy(entities, { id: UNIQUE_IDS.mouse })
}

type TaskName = 'addLine'
type Task = {
    action: () => boolean
    cancel: () => boolean
}
const currTask = ref<TaskName | null>(null)
const tasks: Record<TaskName, Task> = {} as any
type TaskHandle<T> = {
    promise: Promise<T>
    cancel: () => void
} & Disposable
const regTask = <T>(name: TaskName, action: () => TaskHandle<T>) => {
    let taskHandle: TaskHandle<T> | null = null
    const finish = () => {
        taskHandle?.dispose()
        taskHandle = null
        currTask.value = null
    }
    tasks[name] = {
        action: () => {
            if (currTask.value) return false
            currTask.value = name
            taskHandle = action()
            taskHandle.promise.then(finish, err => {
                if (err instanceof CancelError) finish()
                else throw err
            })
            return true
        },
        cancel: () => {
            if (currTask.value === name) {
                taskHandle?.cancel()
                return true
            }
            return false
        }
    }
}

regTask('addLine', () => {
    const { cancel, cancellable } = useCancel()
    const { defer, runDefered } = useDefer()

    const work = async () => {
        setMove(paintMouse)
        defer(() => {
            clearMouse()
            clearClick()
        })
        const { x: x1, y: y1 } = await cancellable(waitClick(getPointer))

        const p1 = addEntity(newDot(x1, y1, { style: { fill: '#ff0' } }))
        setMove(ev => {
            paintMouse(ev)
            const { x: x2, y: y2 } = getPointer(ev)
            addEntity(newLineE(x1, y1, x2, y2, { id: UNIQUE_IDS.tmpLine, grid: ev.shiftKey }))
        })
        defer(() => {
            p1.dispose()
            clearMove()
            removeEntityById(UNIQUE_IDS.tmpLine)
        })
        const { x: x2, y: y2, grid } = await cancellable(waitClick(ev => ({
            grid: ev.shiftKey,
            ...getPointer(ev)
        })))
        
        if (x1 !== x2 || y1 !== y2) addEntity(newLineE(x1, y1, x2, y2, {
            grid,
            edge: {},
            style: {
                stroke: boardOpts.randomColor ? randomColor() : '#fff'
            }
        }))
    }

    return {
        promise: work(),
        cancel,
        dispose: runDefered
    }
})

const clearBoard = () => {
    for (let i = 0; i < nextId.value; i ++) removeEntityById(i)
    initBorder()
}

const initBorder = () => {
    return
    const { width: w, height: h } = boardOpts
    addEntities([
        newLineE(0, 0, w, 0, { edge: {} }),
        newLineE(w, 0, w, h, { edge: {} }),
        newLineE(w, h, 0, h, { edge: {} }),
        newLineE(0, h, 0, 0, { edge: {} }),
    ])
}

initBorder()

Object.assign(globalThis, { entities })
</script>

<template>
    <div class="root">
        <div class="toolbar">
            <button @click="tasks.addLine.action">[Line]</button>
            <button @click="clearBoard">[Clear]</button>
            <button @click="boardOpts.randomColor = ! boardOpts.randomColor">[RandomColor: {{ boardOpts.randomColor }}]</button>
        </div>

        <div ref="boardEl">
            <SvgWrapper
                width="80vh" height="80vh"
                :viewBox="`${vb.x} ${vb.y} ${vb.w * vb.s} ${vb.h * vb.s}`"
            >
                <template v-for="entity of entitiesSorted" :key="entity.id">
                    <component
                        :is="entityRenders[entity.type]"
                        :entity="(entity as any)"
                    ></component>
                </template>
            </SvgWrapper>
        </div>
    </div>
</template>

<style scoped>
.toolbar {
    margin-bottom: 1em;
}

.toolbar > button {
    margin-right: 1em;
}

.root {
    width: 80vh;
    padding: 1em 10vh;
}

svg {
    border: 1px solid red;
}
</style>
