import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router'

import MainView from '../components/views/MainView.vue'
import EditView from '../components/views/EditView.vue'
import PlayView from '../components/views/PlayView.vue'

export const routes: Readonly<RouteRecordRaw[]> = [
    {
        path: '/',
        component: MainView
    },
    {
        path: '/edit',
        component: EditView
    },
    {
        path: '/play',
        component: PlayView
    }
]

export const router = createRouter({
    routes,
    history: createWebHashHistory()
})
