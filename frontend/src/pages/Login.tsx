import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import { Loader2, Eye, EyeOff } from 'lucide-react'

export default function Login() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  
  const from = location.state?.from?.pathname || '/'

  const validatePassword = (pwd: string) => {
    const hasMinLength = pwd.length >= 8
    const hasUpper = /[A-Z]/.test(pwd)
    const hasLower = /[a-z]/.test(pwd)
    const hasNumber = /[0-9]/.test(pwd)
    return { hasMinLength, hasUpper, hasLower, hasNumber, isValid: hasMinLength && hasUpper && hasLower && hasNumber }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    // Client-side validation for signup
    if (!isLogin) {
      const validation = validatePassword(password)
      if (!validation.isValid) {
        let msg = 'Password does not meet requirements: '
        const missing = []
        if (!validation.hasMinLength) missing.push('minimum 8 characters')
        if (!validation.hasUpper || !validation.hasLower) missing.push('both uppercase and lowercase letters')
        if (!validation.hasNumber) missing.push('at least one number')
        setError(msg + missing.join(', '))
        return
      }
    }

    setLoading(true)
    
    try {
      if (isLogin) {
        // Login
        const res = await api.post('/auth/login', {
          email, password
        })
        const token = res.data.access_token
        
        // Fetch user profile
        const userRes = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        })
        
        login(token, userRes.data)
        navigate(from, { replace: true })
      } else {
        // Signup
        await api.post('/auth/signup', {
          email, password
        })
        // Automatically login after signup
        const res = await api.post('/auth/login', {
          email, password
        })
        const token = res.data.access_token
        const userRes = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        })
        login(token, userRes.data)
        navigate(from, { replace: true })
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) {
        // Extract FastAPI validation message
        setError(detail.map((d: any) => d.msg).join(', '))
      } else {
        setError(detail || 'Authentication failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-[#0B1326] text-white">
      {/* Dynamic Space Background */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center opacity-40 scale-105"
        style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=2048&auto=format&fit=crop")' }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1326] via-[#0B1326]/60 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B1326] via-transparent to-[#0B1326]"></div>
      </div>

      {/* Floating Glass Card */}
      <div className="relative z-10 w-full max-w-md p-8 sm:p-10 mx-4 backdrop-blur-2xl bg-[#060d20]/70 border border-white/10 shadow-[0_0_50px_rgba(124,58,237,0.15)] rounded-3xl overflow-hidden">
        
        {/* Decorative Top Glow */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#4cd7f6] to-transparent opacity-50"></div>
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#d2bbff] to-[#4cd7f6] bg-clip-text text-transparent mb-2">
            Smart Journey
          </h1>
          <p className="text-gray-400 text-sm">
            {isLogin ? 'Welcome back, traveler.' : 'Begin your journey.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <AnimatePresence mode="popLayout">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Email Address</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-[#131b2e]/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#4cd7f6]/50 focus:ring-1 focus:ring-[#4cd7f6]/50 transition-all"
              placeholder="astronaut@example.com"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Password</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-[#131b2e]/50 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#7c3aed]/50 focus:ring-1 focus:ring-[#7c3aed]/50 transition-all"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-3.5 text-gray-400 hover:text-white transition-colors"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {!isLogin && password && (
              <div className="mt-2 text-xs space-y-1 p-3 rounded-xl bg-white/5 border border-white/5 animate-in fade-in duration-300">
                <p className="text-gray-400 font-bold mb-1.5 tracking-wider uppercase text-[9px] opacity-60">Security Requirements:</p>
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${password.length >= 8 ? "bg-green-400" : "bg-white/20"}`}></span>
                  <span className={password.length >= 8 ? "text-green-400/90" : "text-white/50"}>
                    At least 8 characters
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${/[A-Z]/.test(password) && /[a-z]/.test(password) ? "bg-green-400" : "bg-white/20"}`}></span>
                  <span className={/[A-Z]/.test(password) && /[a-z]/.test(password) ? "text-green-400/90" : "text-white/50"}>
                    Uppercase & lowercase letter
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${/[0-9]/.test(password) ? "bg-green-400" : "bg-white/20"}`}></span>
                  <span className={/[0-9]/.test(password) ? "text-green-400/90" : "text-white/50"}>
                    At least one number
                  </span>
                </div>
              </div>
            )}
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-4 py-3.5 px-4 bg-gradient-to-r from-[#7c3aed] to-[#4cd7f6] hover:opacity-90 rounded-xl text-white font-bold tracking-wide shadow-lg shadow-[#7c3aed]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            {isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-white/5 pt-6">
          <p className="text-gray-400 text-sm">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button 
              onClick={() => {
                setIsLogin(!isLogin)
                setError('')
              }}
              className="ml-2 text-[#4cd7f6] hover:text-white transition-colors font-medium"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>

      </div>
    </div>
  )
}
