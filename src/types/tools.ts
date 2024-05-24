export type KeyOfUnion<T> = T extends T ? keyof T : never

export type DistributiveOmit<T, K extends KeyOfUnion<T>> = T extends T
    ? Omit<T, K>
    : never

export type RequiredBy<T, Ks extends keyof T> = T & {
    [K in Ks]-?: T[K]
}

export type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false
