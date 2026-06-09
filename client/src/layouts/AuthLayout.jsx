import { Outlet } from 'react-router-dom'

export default function AuthLayout() {
  return (
    <div className="flex flex-col h-screen bg-white">
      <main className="flex-1 flex items-center justify-center px-5 overflow-y-auto">
        <div className="w-full max-w-sm">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
