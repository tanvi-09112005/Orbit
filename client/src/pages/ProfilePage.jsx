import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Settings, Bell, LogOut, Upload, Pencil, Check, X, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useFamilyStore } from '../stores/familyStore'
import { useUIStore } from '../stores/uiStore'
import Card from '../components/ui/Card'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, logout, updateProfile } = useAuthStore()
  const { family, members, children, reset } = useFamilyStore()
  const { addToast } = useUIStore()

  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(user?.user_metadata?.name || '')
  const [savingName, setSavingName] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)

  const userName = user?.user_metadata?.name || 'User'
  const userEmail = user?.email

  const menuItems = [
    { label: 'Family Settings', icon: Settings, path: '/profile/family-settings' },
    { label: 'Import Calendar', icon: Upload, path: '/profile/import-calendar' },
    { label: 'Notifications', icon: Bell, path: '/profile/notifications' },
  ]

  const handleSaveName = async () => {
    if (!nameValue.trim() || nameValue === user?.user_metadata?.name) {
      setEditingName(false); return
    }
    setSavingName(true)
    try {
      await updateProfile({ name: nameValue.trim() })
      addToast('Name updated', 'success')
      setEditingName(false)
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setSavingName(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    reset()
    navigate('/login')
  }

  const handleDeleteAccount = async () => {
    if (!confirm('Delete your account and all family data? This cannot be undone.')) return
    if (!confirm('Are you absolutely sure? Everything will be deleted permanently.')) return
    setDeletingAccount(true)
    try {
      // Delete family (cascade deletes all related data via DB constraints)
      if (family?.id) {
        await supabase.from('families').delete().eq('id', family.id)
      }
      // Sign out — actual auth user deletion requires Edge Function in production
      await logout()
      reset()
      navigate('/login')
      addToast('Account deleted', 'success')
    } catch (err) {
      addToast(err.message, 'error')
      setDeletingAccount(false)
    }
  }

  return (
    <div className="space-y-6 pt-4 pb-8">
      {/* Profile Header */}
      <div className="text-center">
        <Avatar name={userName} size="xl" className="mx-auto mb-4" />

        {editingName ? (
          <div className="flex items-center gap-2 justify-center mt-2">
            <input
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false) }}
              className="border-b-2 border-primary text-h1 font-serif text-primary text-center bg-transparent focus:outline-none w-48"
              autoFocus
            />
            <button onClick={handleSaveName} disabled={savingName} className="p-1 text-primary">
              <Check size={18} />
            </button>
            <button onClick={() => { setEditingName(false); setNameValue(userName) }} className="p-1 text-text-secondary">
              <X size={18} />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-h1 font-serif text-primary">{userName}</h1>
            <button onClick={() => setEditingName(true)} className="p-1 text-text-secondary hover:text-primary transition-colors" aria-label="Edit name">
              <Pencil size={16} />
            </button>
          </div>
        )}
        <p className="text-caption text-text-secondary mt-1">{userEmail}</p>
      </div>

      {/* Family Info */}
      {family && (
        <Card className="bg-primary-light border-2 border-primary">
          <h3 className="text-h3 font-semibold text-primary mb-3">{family.name}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-caption text-text-secondary">Members</p>
              <p className="text-h2 font-serif text-primary">{members.length}</p>
            </div>
            <div>
              <p className="text-caption text-text-secondary">Children</p>
              <p className="text-h2 font-serif text-primary">{children.length}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Menu Items */}
      <div className="space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon
          return (
            <Card
              key={item.label}
              className="flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(item.path)}
            >
              <div className="flex items-center gap-3">
                <Icon size={20} className="text-primary" />
                <p className="text-body font-semibold">{item.label}</p>
              </div>
              <ChevronRight size={20} className="text-text-secondary" />
            </Card>
          )
        })}
      </div>

      <Button variant="danger" className="w-full" onClick={handleLogout}>
        <LogOut size={18} /> Sign Out
      </Button>

      {/* Delete account */}
      <div className="pt-2">
        <button
          onClick={handleDeleteAccount}
          disabled={deletingAccount}
          className="w-full text-caption text-text-secondary hover:text-coral transition-colors underline text-center"
        >
          {deletingAccount ? 'Deleting...' : 'Delete my account and all data'}
        </button>
        <div className="flex justify-center gap-4 pt-2">
  <a href="/privacy" className="text-caption text-text-secondary hover:text-primary">Privacy Policy</a>
  <span className="text-caption text-text-secondary">·</span>
  <a href="/terms" className="text-caption text-text-secondary hover:text-primary">Terms of Service</a>
</div>
 
      </div>
    </div>
  )
}