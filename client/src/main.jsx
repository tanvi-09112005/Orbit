import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { registerSW } from 'virtual:pwa-register'
import { supabase } from './lib/supabase'
import { useAuthStore } from './stores/authStore'
import router from './router'
import ToastProvider from './components/ToastProvider'
import './globals.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
    },
  },
})

// Auth listener — must run before render
supabase.auth.getSession().then(({ data: { session } }) => {
  useAuthStore.getState().setSession(session)
})
supabase.auth.onAuthStateChange((_event, session) => {
  useAuthStore.getState().setSession(session)
})

// PWA service worker registration with auto-update
registerSW({
  onNeedRefresh() {
    // App has updated — reload automatically
    // Could show a toast here if desired
    window.location.reload()
  },
  onOfflineReady() {
    console.log('Orbit is ready to work offline')
  },
})

function App() {
  return (
    <>
      <RouterProvider router={router} />
      <ToastProvider />
    </>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
)