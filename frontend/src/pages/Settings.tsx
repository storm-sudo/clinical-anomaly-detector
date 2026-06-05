import React, { useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { authApi } from '../api/auth'
import { User, Shield, Server, Database, Save, Key, AppWindow, Cpu } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Settings() {
  const { user, token, updateUser } = useAuthStore()
  
  // Local state for form inputs
  const [name, setName] = useState(user?.name || '')
  const [organization, setOrganization] = useState(user?.organization || '')
  const [isUpdating, setIsUpdating] = useState(false)

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUpdating(true)
    try {
      await authApi.updateMe({ name, organization })
      updateUser({ name, organization })
      toast.success('Profile updated successfully')
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setIsUpdating(false)
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
          <Shield className="w-8 h-8 text-gray-900" />
          System Settings
        </h1>
        <p className="text-gray-500 mt-1">
          Manage your analyst profile, examine API endpoints, and view configuration parameters.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Form Settings */}
        <div className="md:col-span-2 space-y-6">
          {/* Profile Details */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
              <User className="w-5 h-5 text-gray-900" />
              Analyst Profile
            </h2>
            
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="name" className="text-xs font-semibold text-gray-555 uppercase tracking-wider">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-gray-800 text-sm focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 focus:outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="org" className="text-xs font-semibold text-gray-555 uppercase tracking-wider">
                    Organization / Biotech
                  </label>
                  <input
                    type="text"
                    id="org"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-gray-800 text-sm focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-555 uppercase tracking-wider">
                  Email Address (Read-only)
                </label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-gray-400 text-sm cursor-not-allowed"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 hover:scale-[1.01] transition-all disabled:opacity-50 shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  {isUpdating ? 'Saving Profile...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Security details */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
              <Key className="w-5 h-5 text-gray-900" />
              API Security Credential
            </h2>
            <p className="text-xs text-gray-500 leading-relaxed">
              Use this bearer token to authenticate command line scripts or external requests against the API gateway.
            </p>
            <div className="bg-gray-50 border border-gray-200 p-3.5 rounded-xl flex items-center justify-between font-mono text-[10px]">
              <span className="truncate max-w-[400px] text-gray-800 select-all">
                {token || 'No active token'}
              </span>
              <button 
                onClick={() => {
                  if (token) {
                    navigator.clipboard.writeText(token)
                    toast.success('Access token copied to clipboard')
                  }
                }}
                className="text-xs text-gray-900 hover:text-gray-700 font-semibold px-2 transition-all"
              >
                Copy Token
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Platform Configuration Info */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-4 h-full">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
              <Server className="w-5 h-5 text-gray-900" />
              Platform Diagnostics
            </h2>

            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <span className="text-gray-400 font-semibold block uppercase tracking-wider text-[10px]">API URL Host</span>
                <span className="font-mono text-gray-705">http://localhost:8000</span>
              </div>
              <div className="space-y-1">
                <span className="text-gray-400 font-semibold block uppercase tracking-wider text-[10px]">Environment Mode</span>
                <span className="font-mono text-gray-705 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> development
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-gray-400 font-semibold block uppercase tracking-wider text-[10px]">AWS S3 Local Fallback</span>
                <span className="font-mono text-gray-705 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" /> Active (USE_LOCAL_STORAGE=true)
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-gray-400 font-semibold block uppercase tracking-wider text-[10px]">Redis Connection</span>
                <span className="font-mono text-gray-705 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Connected
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-gray-400 font-semibold block uppercase tracking-wider text-[10px]">Celery Broker</span>
                <span className="font-mono text-gray-705">redis://localhost:6379/0</span>
              </div>
              <div className="space-y-1">
                <span className="text-gray-400 font-semibold block uppercase tracking-wider text-[10px]">Ensemble ML Engine version</span>
                <span className="font-mono text-gray-705 flex items-center gap-1"><Cpu className="w-3.5 h-3.5 text-gray-400" /> v1.4.2 (scikit-learn)</span>
              </div>
              <div className="space-y-1">
                <span className="text-gray-400 font-semibold block uppercase tracking-wider text-[10px]">Web App Client</span>
                <span className="font-mono text-gray-705 flex items-center gap-1"><AppWindow className="w-3.5 h-3.5 text-gray-400" /> Vite + React v18 + TypeScript</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
