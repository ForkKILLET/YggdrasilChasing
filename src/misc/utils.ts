import { Equal } from "../types/tools"

export const findIndexBy = <T>(xs: T[], pred: Partial<T>): number => {
    return xs.findIndex(x => {
        for (const k in pred) {
            if (x[k] !== pred[k]) return false
        }
        return true
    })
}

export const findBy = <T>(xs: T[], pred: Partial<T>): T | undefined => {
    const index = findIndexBy(xs, pred)
    if (index < 0) return undefined
    return xs[index]
}

export const deleteBy = <T>(xs: T[], pred: Partial<T>): T[] => {
    const index = findIndexBy(xs, pred)
    if (index < 0) return []
    return xs.splice(index, 1)
}

export const upsert = <T>(xs: T[], pred: Partial<T>, x: T): T => {
    deleteBy(xs, pred)
    xs.push(x)
    return x
}

export const isBetween = (x: number, a: number, b: number) => (
    x >= Math.min(a, b) && x <= Math.max(a, b)
)

export const randomColor = () => '#' + ('000000' + (Math.random() * 1e12 | 0).toString(16)).slice(-6)

export const call = <T>(f: () => T): T => f()

export const groupBy = <K, T, U = T>(
    xs: T[],
    getKey: (x: T) => K,
    map: (Equal<U, T> extends true ? undefined : never) | ((item: T) => U)
): Map<K, U[]> => {
    const result = new Map<K, U[]>()
    xs.forEach(item => {
        const key = getKey(item)
        if (! result.has(key)) result.set(key, [])
        result.get(key)!.push((map ? map(item) : item) as U)
    })
    return result
}
