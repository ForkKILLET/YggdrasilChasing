import { ref, reactive, computed, FunctionalComponent, h } from 'vue'
import { upsert, deleteBy, isBetween, groupBy, randomColor } from '../misc/utils'
import { Disposable } from '../types/disposable'
import { Point } from '../types/common'
import { RequiredBy } from '../types/tools'
import { boardOpts } from './board'

export type LineEntityBase = {
    type: 'Line'
    args: {
        x1: number
        y1: number
        x2: number
        y2: number
    }
    args2: {
        a: number
        b: number
        c: number
    }
    ends: Point[]
}
export type LineEntity = LineEntityBase & EntityExtra

export type DotEntityBase = {
    type: 'Dot'
    args: {
        x: number
        y: number
    }
    ends: Point[]
}
export type DotEntity = DotEntityBase & EntityExtra

export type EntityEdgeData = {
}

export type EntityExtra = {
    style?: any
    id: number
    edge?: EntityEdgeData
    inter?: {
        e1: Entity
        e2: Entity
    }
    zIndex: number
}

export type PreEntityExtra = Omit<Partial<EntityExtra>, 'edge'> & { edge?: Partial<EntityEdgeData> }

const newEntityExtra = (extra: PreEntityExtra = {}): EntityExtra => {
    return {
        ...extra,
        id: extra.id ?? getEntityId(),
        zIndex: extra.zIndex ?? 0,
        edge: extra.edge as any
    }
}

export type Entity = LineEntity | DotEntity

export const nextId = ref(0)

const getEntityId = () => {
    return nextId.value ++
}

export const newLineE = <Ex extends PreEntityExtra>(x1: number, y1: number, x2: number, y2: number, extra?: Ex & { grid?: boolean }): LineEntity & Ex => {
    if (extra?.grid) {
        const dx = Math.abs(x2 - x1)
        const dy = Math.abs(y2 - y1)
        if (dy > dx) x2 = x1
        else y2 = y1
    }
    return {
        type: 'Line',
        args: { x1, y1, x2, y2 },
        args2: {
            a: y2 - y1,
            b: x1 - x2,
            c: x2 * y1 - x1 * y2
        },
        ends: [ { x: x1, y: y1 }, { x: x2, y: y2 } ],
        ...newEntityExtra(extra)
    } as any
}

export const newDot = <Ex extends PreEntityExtra>(x: number, y: number, extra?: Ex): DotEntity & Ex => ({
    type: 'Dot',
    args: { x, y },
    ends: [ { x, y } ],
    ...newEntityExtra(extra)
} as any)

export const entities: Entity[] = reactive([])

export const entitiesSorted = computed(() => [...entities].sort((e1, e2) => e1.zIndex - e2.zIndex))

export const isOnLine = (x: number, y: number, line: LineEntity) => {
    const { x1, y1, x2, y2 } = line.args
    return isBetween(x, x1, x2) && isBetween(y, y1, y2)
}

export const isSameNumber = (x: number, y: number) => Math.abs(x - y) < 1e-5

export const isSamePoint = (p1: Point, p2: Point) => isSameNumber(p1.x, p2.x) && isSameNumber(p1.y, p2.y)

export const isEndPoint = (point: Point, entity: EdgeEntity) =>
    entity.ends.some(p => isSamePoint(p, point))

export const calcIntersection = (e1: EdgeEntity, e2: EdgeEntity): Point | null => {
    if (e1.type === 'Line' && e2.type === 'Line') {
        const { a: a1, b: b1, c: c1 } = e1.args2
        const { a: a2, b: b2, c: c2 } = e2.args2

        let x, y
        if (a1 * b2 === a2 * b1) return null // e1 // e2

        if (a1 === 0) { // e1 // x-axis
            y = - c1 / b1
            x = - (c2 + b2 * y) / a2
        }

        else if (a2 === 0) { // e2 // x-axis
            y = - c2 / b2
            x = - (c1 + b1 * y) / a1
        }

        else {
            y = (a2 * c1 - a1 * c2) / (a1 * b2 - a2 * b1)
            x = - (c2 + b2 * y) / a2
        }

        if (isOnLine(x, y, e1) && isOnLine(x, y, e2)) return { x, y }
        return null
    }
    return null
}

type EdgeEntity = RequiredBy<Entity, 'edge'>

export const splitEntity = (base: EdgeEntity, { x: x0, y: y0 }: Point): [ EdgeEntity, EdgeEntity ] => {
    switch (base.type) {
        case 'Line': {
            const { x1, y1, x2, y2 } = base.args
            return [
                newLineE(x1, y1, x0, y0, { edge: {} }),
                newLineE(x2, y2, x0, y0, { edge: {} })
            ]
        }
        default:
            throw null
    }
}

export const multiSplitEntity = (base: EdgeEntity, points: Point[]): void => {
    if (! points.length) return

    let curr = base
    const segments: EdgeEntity[] = []
    for (const point of points) {
        const [ segment, next ] = splitEntity(curr, point)
        segments.push(segment)
        curr = next
    }
    segments.push(curr)
    removeEntityById(base.id)
    if (boardOpts.randomColor) {
        segments.forEach(e => {
            (e.style ??= {}).stroke = randomColor()
        })
    }
    addEntities(segments, { noInterCheck: true })
}

export const updateIntersectionBy = (base: EdgeEntity) => {
    const inters: { target: EdgeEntity, point: Point }[] = []

    entities.filter((e): e is EdgeEntity => !! e.edge && e !== base).forEach(target => {
        const point = calcIntersection(base, target)
        if (point) {
            const { x, y } = point
            addEntity(newDot(x, y, {
                inter: {
                    e1: base,
                    e2: target
                },
                zIndex: 1,
                style: { fill: 'none' }
            }))

            inters.push({ target, point })
        }
    })

    if (inters.length) {
        multiSplitEntity(base, inters.map(i => i.point).filter(point => ! isEndPoint(point, base)))
        const targets = groupBy(
            inters.filter(({ target, point }) => ! isEndPoint(point, target)),
            i => i.target,
            i => i.point
        )
        targets.forEach((points, target) => multiSplitEntity(target, points))
    }
}

export type AddEntityOpts = {
    noInterCheck?: boolean
}

export const addEntity = (entity: Entity, opts: AddEntityOpts = {}): Disposable => {
    const { id } = entity
    upsert(entities, { id }, entity)
    if (! opts.noInterCheck && entity.edge) updateIntersectionBy(entity as EdgeEntity)
    return {
        dispose: () => {
            deleteBy(entities, { id })
        }
    }
}

export const removeEntityById = (id: number): boolean => {
    return deleteBy(entities, { id }).length > 0
}

export const addEntities = (entities: Entity[], opts: AddEntityOpts = {}): Disposable => {
    const disposeHandles = entities.map(e => addEntity(e, opts))
    return {
        dispose: () => disposeHandles.forEach(handle => handle.dispose())
    }
}

export const UNIQUE_IDS = {
    // topBorder: -1,
    // rightBorder: -2,
    // bottomBorder: -3,
    // leftBorder: -4,
    mouse: -5,
    tmpLine: -6
} as const

export type EntityRender<K extends Entity['type']> = FunctionalComponent<{
    entity: Entity & { type: K }
}>

export type EntityRenders = {
    [K in Entity['type']]: EntityRender<K>
}

export const entityRenders: EntityRenders = {
    Line: ({ entity }) => {
        const { args: { x1, y1, x2, y2 }, style } = entity
        return h('line', {
            x1, y1, x2, y2,
            stroke: '#fff',
            ...style
        })
    },
    Dot: ({ entity }) => {
        const { args: { x, y }, style } = entity
        return h('circle', {
            cx: x, cy: y, r: 3,
            stroke: '#fff',
            ...style
        })
    }
}

