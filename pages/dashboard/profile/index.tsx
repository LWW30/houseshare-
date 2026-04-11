import { useEffect, useState, useRef } from 'react'
import Layout from '../../../components/Layout'
import { useAuth } from '../../../lib/useAuth'
import { useTheme } from '../../../lib/ThemeContext'
import { supabase, signOut } from '../../../lib/supabase'
import { useRouter } from 'next/router'
import { User, Camera, Sun, Moon, Trash2, Lock, Mail, Check, Loader2, AlertTriangle, X } from 'lucide-react'

export default function ProfilePage() {
  const { user, loading } = useAuth()
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState({ display_name: '', avatar_url: '', notification_email: '' })
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  // Password change
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  // Delete account
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => {
      if (data) {
        setProfile({ display_name: data.display_name || '', avatar_url: data.avatar_url || '' })
        if (data.theme) setTheme(data.theme)
      }
    })
  }, [user])

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploadingAvatar(true)
    setError('')
    try {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/avatar.${ext}`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const avatarUrl = data.publicUrl + '?t=' + Date.now()
      await supabase.from('profiles').upsert({ id: user.id, avatar_url: path })
      setProfile(p => ({ ...p, avatar_url: path }))
      setAvatarPreview(avatarUrl)
    } catch (e: any) { setError(e.message) }
    finally { setUploadingAvatar(false) }
  }

  const getAvatarUrl = async () => {
    if (!profile.avatar_url) return null
    const { data } = await supabase.storage.from('avatars').createSignedUrl(profile.avatar_url, 3600)
    return data?.signedUrl || null
  }

  const handleSaveProfile = async () => {
    if (!user) return
    setSaving(true); setError(''); setSuccess('')
    try {
      await supabase.from('profiles').upsert({
        id: user.id,
        display_name: profile.display_name,
        theme,
      })
      setSuccess('Profile saved successfully')
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  const handleThemeChange = async (t: 'light' | 'dark') => {
    setTheme(t)
    if (user) {
      await supabase.from('profiles').upsert({ id: user.id, theme: t })
    }
  }

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return }
    if (newPassword.length < 6) { setError('Password must be at least 6 characters'); return }
    setChangingPassword(true); setError(''); setSuccess('')
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setSuccess('Password updated successfully')
      setNewPassword(''); setConfirmPassword('')
    } catch (e: any) { setError(e.message) }
    finally { setChangingPassword(false) }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE' || !user) return
    setDeleting(true)
    try {
      // Delete all user data in order
      const { data: props } = await supabase.from('properties').select('id').eq('landlord_id', user.id)
      const propertyIds = props?.map(p => p.id) || []

      if (propertyIds.length > 0) {
        await supabase.from('shared_bills').delete().in('property_id', propertyIds)
        await supabase.from('rent_payments').delete().in('property_id', propertyIds)
        const { data: tenants } = await supabase.from('tenants').select('id').in('property_id', propertyIds)
        if (tenants?.length) await supabase.from('tenants').delete().in('property_id', propertyIds)
        await supabase.from('rooms').delete().in('property_id', propertyIds)
        await supabase.from('properties').delete().eq('landlord_id', user.id)
      }

      // Delete compliance documents
      await supabase.from('compliance_documents').delete().eq('landlord_id', user.id)

      // Delete storage files
      const { data: docFiles } = await supabase.storage.from('documents').list(user.id)
      if (docFiles?.length) {
        await supabase.storage.from('documents').remove(docFiles.map(f => `${user.id}/${f.name}`))
      }
      const { data: avatarFiles } = await supabase.storage.from('avatars').list(user.id)
      if (avatarFiles?.length) {
        await supabase.storage.from('avatars').remove(avatarFiles.map(f => `${user.id}/${f.name}`))
      }

      // Delete profile
      await supabase.from('profiles').delete().eq('id', user.id)

      // Sign out and redirect
      await signOut()
      router.push('/login')
    } catch (e: any) { setError(e.message); setDeleting(false) }
  }

  if (loading) return (
    <Layout><div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-gray-400" /></div></Layout>
  )

  return (
    <Layout>
      <div className="p-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Profile</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Manage your account settings</p>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}
        {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 flex items-center gap-2"><Check size={14} />{success}</div>}

        {/* Avatar + name */}
        <div className="card p-6 mb-4">
          <h2 className="font-medium text-sm mb-4" style={{ color: 'var(--text-primary)' }}>Profile details</h2>
          <div className="flex items-center gap-5 mb-5">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <User size={24} className="text-gray-400" />
                )}
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-1 -right-1 w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors"
              >
                {uploadingAvatar ? <Loader2 size={10} className="animate-spin text-white" /> : <Camera size={10} className="text-white" />}
              </button>
              <input ref={fileRef} type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
            </div>
            <div>
              <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {profile.display_name || user?.email}
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{user?.email}</div>
              <button onClick={() => fileRef.current?.click()} className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                Change photo
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label">Display name</label>
              <input className="input" placeholder="Your name" value={profile.display_name}
                onChange={e => setProfile(p => ({ ...p, display_name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" value={user?.email || ''} disabled style={{ opacity: 0.6 }} />
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Email cannot be changed here</p>
            </div>
            <div>
              <label className="label">Maintenance alert email</label>
              <input
                className="input"
                type="email"
                placeholder={user?.email || 'your@email.com'}
                value={profile.notification_email}
                onChange={e => setProfile(p => ({ ...p, notification_email: e.target.value }))}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Receive email alerts when tenants report maintenance issues. Defaults to your account email.</p>
            </div>
          </div>

          <button onClick={handleSaveProfile} disabled={saving} className="btn-primary mt-4 flex items-center gap-2">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Save changes
          </button>
        </div>

        {/* Theme */}
        <div className="card p-6 mb-4">
          <h2 className="font-medium text-sm mb-4" style={{ color: 'var(--text-primary)' }}>Appearance</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleThemeChange('light')}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-colors ${
                theme === 'light' ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Sun size={18} className="text-amber-500" />
              <div className="text-left">
                <div className="text-sm font-medium text-gray-900">Light</div>
                <div className="text-xs text-gray-400">Default mode</div>
              </div>
              {theme === 'light' && <Check size={14} className="text-gray-900 ml-auto" />}
            </button>
            <button
              onClick={() => handleThemeChange('dark')}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-colors ${
                theme === 'dark' ? 'border-gray-400 bg-gray-800' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Moon size={18} className="text-blue-400" />
              <div className="text-left">
                <div className="text-sm font-medium" style={{ color: theme === 'dark' ? '#f9fafb' : '#111827' }}>Dark</div>
                <div className="text-xs text-gray-400">Easy on the eyes</div>
              </div>
              {theme === 'dark' && <Check size={14} className="text-gray-300 ml-auto" />}
            </button>
          </div>
        </div>

        {/* Change password */}
        <div className="card p-6 mb-4">
          <h2 className="font-medium text-sm mb-4" style={{ color: 'var(--text-primary)' }}>Change password</h2>
          <div className="space-y-4">
            <div>
              <label className="label">New password</label>
              <input className="input" type="password" placeholder="••••••••" value={newPassword}
                onChange={e => setNewPassword(e.target.value)} />
            </div>
            <div>
              <label className="label">Confirm new password</label>
              <input className="input" type="password" placeholder="••••••••" value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)} />
            </div>
          </div>
          <button onClick={handleChangePassword} disabled={changingPassword || !newPassword} className="btn-primary mt-4 flex items-center gap-2">
            {changingPassword ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
            Update password
          </button>
        </div>

        {/* Delete account */}
        <div className="card p-6 border-red-200" style={{ borderColor: '#fecaca' }}>
          <h2 className="font-medium text-sm text-red-700 mb-1">Danger zone</h2>
          <p className="text-xs text-red-500 mb-4">Permanently delete your account and all associated data. This cannot be undone.</p>
          <button onClick={() => setShowDeleteModal(true)} className="btn-danger flex items-center gap-2">
            <Trash2 size={14} /> Delete my account
          </button>
        </div>

        {/* Delete confirmation modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl mx-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center">
                    <AlertTriangle size={16} className="text-red-600" />
                  </div>
                  <h2 className="font-semibold text-gray-900">Delete account</h2>
                </div>
                <button onClick={() => setShowDeleteModal(false)}><X size={18} className="text-gray-400" /></button>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                This will permanently delete your account and all data including:
              </p>
              <ul className="text-sm text-gray-600 mb-4 space-y-1 ml-4">
                <li>• All properties, rooms and tenants</li>
                <li>• All rent payment records</li>
                <li>• All shared bills</li>
                <li>• All uploaded documents</li>
                <li>• Your profile and account</li>
              </ul>

              <div className="mb-4">
                <label className="label">Type DELETE to confirm</label>
                <input className="input" placeholder="DELETE" value={deleteConfirm}
                  onChange={e => setDeleteConfirm(e.target.value)} />
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowDeleteModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirm !== 'DELETE' || deleting}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  Delete everything
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
