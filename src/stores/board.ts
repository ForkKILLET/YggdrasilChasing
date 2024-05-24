import { reactive } from 'vue'

export const boardOpts = reactive({
    randomColor: false,
    width: 500,
    height: 500
})

export const boardViewBox = reactive({
    x: 0,
    y: 0,
    w: boardOpts.width,
    h: boardOpts.height,
    s: 1  
})
