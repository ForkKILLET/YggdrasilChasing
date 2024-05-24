{
const f = () => new Promise(resolve => setTimeout(resolve, 2000))
const fR = () => new Promise(resolve => setTimeout(() => resolve(1), 2000))
const g = function*(name) {
	console.log('[%s] a', name)
	yield f()
	console.log('[%s] b', name)
	const a = yield fR()
	console.log('[%s] c: %d', name, a)
	yield f()
	console.log('[%s] d', name)
}

const g2a = (G) => {
	let cancelled = false
	return {
	    work: async (...args) => {
			const g = G(...args)
			let node
			for (;;) {
				const { value, done } = g.next(node)
				if (done) return value
				if (cancelled) throw 'cancel'
				node = await value
			}
		},
		cancel: () => { cancelled = true }
	}
}

g2a(g).work('1')

const {work, cancel}=g2a(g)
work('2').catch(e => console.log('caught %o', e))
setTimeout(cancel, 1000)
}
