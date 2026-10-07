import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Plane } from 'lucide-react'

export default function ProtectedRoute() {
  const { token, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B1326] flex items-center justify-center text-[#4cd7f6]">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <Plane className="w-12 h-12" />
          <p className="tracking-widest uppercase text-sm font-bold">Authenticating...</p>
        </div>
      </div>
    )
  }

  if (!token) {
    // Redirect to login but save the attempted url
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}
