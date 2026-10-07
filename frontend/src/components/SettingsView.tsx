import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'
import { Save, User, Shield, Globe, Check } from 'lucide-react'

export default function SettingsView() {
  const { user, updateUser } = useAuth()
  const [activeTab, setActiveTab] = useState<'profile' | 'app' | 'security'>('profile')
  
  // State variables for settings
  const [origin, setOrigin] = useState('')
  const [currency, setCurrency] = useState('INR')
  const [dietary, setDietary] = useState<string[]>([])
  // Account settings
  const [email, setEmail] = useState('')
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    if (user) {
      setEmail(user.email)
      const settings = user.settings || {}
      setOrigin(settings.default_origin || 'India')
      setCurrency(settings.preferred_currency || 'INR')
      setDietary(settings.dietary_preferences || [])
    }
  }, [user])

  const toggleDietary = (preference: string) => {
    setDietary(prev => 
      prev.includes(preference) 
        ? prev.filter(p => p !== preference) 
        : [...prev, preference]
    )
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const updatedSettings = {
        default_origin: origin,
        preferred_currency: currency,
        dietary_preferences: dietary
      }

      const response = await api.put(
        '/auth/settings',
        { settings: updatedSettings }
      )

      updateUser(response.data)
      setMessage({ type: 'success', text: 'Settings saved successfully!' })
    } catch (err: any) {
      console.error(err)
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to save settings.' })
    } finally {
      setSaving(false)
    }
  }

  const handleSecurityUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (!oldPassword) {
      setMessage({ type: 'error', text: 'Please enter your current password.' })
      return
    }

    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'New password must be at least 8 characters long.' })
      return
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' })
      return
    }

    setSaving(true)

    try {
      await api.put(
        '/auth/change-password',
        {
          old_password: oldPassword,
          new_password: newPassword
        }
      )

      setMessage({ type: 'success', text: 'Password updated successfully!' })
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      console.error(err)
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to update password.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-[#d2bbff] to-[#4cd7f6] bg-clip-text text-transparent tracking-tight">Account & Travel Settings</h1>
        <p className="text-gray-400 text-sm mt-1">Configure your travel profile and AI generation preferences.</p>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl border text-sm flex items-center gap-2 animate-in fade-in duration-300 ${message.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
          {message.type === 'success' && <Check size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        {/* Navigation Sidebar */}
        <div className="w-full md:w-56 flex flex-col gap-2 shrink-0">
          <button
            onClick={() => { setActiveTab('profile'); setMessage(null) }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${activeTab === 'profile' ? 'bg-[#131b2e] text-[#4cd7f6] border border-white/10 shadow-sm' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <User size={16} /> Traveler Profile
          </button>
          <button
            onClick={() => { setActiveTab('app'); setMessage(null) }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${activeTab === 'app' ? 'bg-[#131b2e] text-[#4cd7f6] border border-white/10 shadow-sm' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <Globe size={16} /> App Preferences
          </button>
          <button
            onClick={() => { setActiveTab('security'); setMessage(null) }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${activeTab === 'security' ? 'bg-[#131b2e] text-[#4cd7f6] border border-white/10 shadow-sm' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <Shield size={16} /> Security & Account
          </button>
        </div>

        {/* Form Content */}
        <div className="flex-1 card bg-gradient-to-br from-[#131b2e] to-[#060d20] border-white/5 shadow-xl p-8 rounded-3xl">
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <h2 className="text-xl font-bold tracking-tight text-white mb-4">✈️ Traveler Profile</h2>
              
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Default Origin City</label>
                <input 
                  type="text" 
                  value={origin}
                  onChange={e => setOrigin(e.target.value)}
                  className="w-full bg-[#0B1326]/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#4cd7f6]/50 transition-all text-sm"
                  placeholder="e.g. Mumbai, India"
                />
                <p className="text-gray-500 text-xs mt-1">This will automatically pre-populate your flight origin parameter.</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Dietary Preferences</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-1">
                  {['Vegetarian', 'Vegan', 'Gluten-Free', 'Halal', 'Pescatarian', 'Keto', 'Dairy-Free', 'Nut Allergy', 'Kosher'].map(pref => {
                    const isSel = dietary.includes(pref)
                    return (
                      <button
                        key={pref}
                        type="button"
                        onClick={() => toggleDietary(pref)}
                        className={`py-3 px-4 rounded-xl border text-left text-xs font-semibold transition ${isSel ? 'border-[#4cd7f6] bg-[#4cd7f6]/10 text-white' : 'border-white/5 bg-[#0B1326]/30 text-gray-400 hover:bg-white/5'}`}
                      >
                        {pref}
                      </button>
                    )
                  })}
                </div>
                <p className="text-gray-500 text-xs">Used to filter must-try restaurant recommendations.</p>
              </div>

              <button 
                type="submit" 
                disabled={saving}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-[#4cd7f6] text-[#0B1326] font-bold rounded-xl text-sm hover:bg-[#4cd7f6]/90 transition disabled:opacity-50"
              >
                <Save size={16} /> Save Traveler Profile
              </button>
            </form>
          )}

          {activeTab === 'app' && (
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <h2 className="text-xl font-bold tracking-tight text-white mb-4">🌍 Display Preferences</h2>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Preferred Currency</label>
                <select
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  className="w-full bg-[#0B1326]/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#4cd7f6]/50 transition-all text-sm"
                >
                  <option value="INR">INR (₹) - Indian Rupee</option>
                  <option value="USD">USD ($) - United States Dollar</option>
                  <option value="EUR">EUR (€) - Euro</option>
                  <option value="JPY">JPY (¥) - Japanese Yen</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Visual Theme</label>
                <select
                  disabled
                  className="w-full bg-[#0B1326]/50 border border-white/10 rounded-xl px-4 py-3 text-white/40 cursor-not-allowed text-sm"
                >
                  <option value="nebula">Dark Nebula (Default)</option>
                  <option value="starlight">Starlight Bright (Coming Soon)</option>
                </select>
              </div>



              <button 
                type="submit" 
                disabled={saving}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-[#4cd7f6] text-[#0B1326] font-bold rounded-xl text-sm hover:bg-[#4cd7f6]/90 transition disabled:opacity-50"
              >
                <Save size={16} /> Save Preferences
              </button>
            </form>
          )}

          {activeTab === 'security' && (
            <form onSubmit={handleSecurityUpdate} className="space-y-6">
              <h2 className="text-xl font-bold tracking-tight text-white mb-4">🛡️ Security & Account</h2>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Email Address</label>
                <input 
                  type="email" 
                  disabled
                  value={email}
                  className="w-full bg-[#0B1326]/30 border border-white/5 rounded-xl px-4 py-3 text-white/40 cursor-not-allowed text-sm"
                />
              </div>

               <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Current Password</label>
                <input 
                  type="password" 
                  value={oldPassword}
                  onChange={e => setOldPassword(e.target.value)}
                  className="w-full bg-[#0B1326]/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#7c3aed]/50 transition-all text-sm"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">New Password</label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full bg-[#0B1326]/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#7c3aed]/50 transition-all text-sm"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Confirm New Password</label>
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full bg-[#0B1326]/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#7c3aed]/50 transition-all text-sm"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button 
                type="submit" 
                disabled={saving || !oldPassword || !newPassword || !confirmPassword}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-[#7c3aed] text-white font-bold rounded-xl text-sm hover:bg-[#7c3aed]/90 transition disabled:opacity-50"
              >
                <Save size={16} /> Update Security
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
