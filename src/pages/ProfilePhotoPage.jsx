import { useRef, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useStore } from '../context/StoreContext.jsx'
import PageHeader from '../components/PageHeader.jsx'
import ProfileAvatar from '../components/ProfileAvatar.jsx'
import { AVATAR_PRESETS } from '../data/avatarPresets.js'
import PresetAvatarFace from '../components/PresetAvatarFace.jsx'
import { isCustomProfilePhoto, processProfilePhotoFile } from '../lib/profilePhoto.js'

const MAX_BYTES = 2 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export default function ProfilePhotoPage() {
  const { activeProfile, updateProfile } = useStore()
  const fileRef = useRef(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!activeProfile) {
    return <Navigate to="/login" replace />
  }

  const current = activeProfile.profilePhoto

  function choosePreset(id) {
    setError('')
    updateProfile({ profilePhoto: id })
  }

  function processFile(file) {
    setError('')
    if (!file) return
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Choose a JPEG, PNG or WebP image.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('The photo may be at most 2 MB.')
      return
    }

    setLoading(true)
    processProfilePhotoFile(file)
      .then((dataUrl) => updateProfile({ profilePhoto: dataUrl }))
      .catch(() => setError('The photo could not be processed.'))
      .finally(() => setLoading(false))
  }

  function removePhoto() {
    setError('')
    updateProfile({ profilePhoto: null })
  }

  return (
    <div>
      <PageHeader title="Profile photo" subtitle="Pick an avatar or upload your own photo" back />

      <div className="space-y-5 px-4 py-4">
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <ProfileAvatar profile={activeProfile} size="xl" />
          <p className="text-center text-sm text-slate-500">
            This is how you appear in the app. Tap a preset or upload your own photo.
          </p>
        </div>

        <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <h2 className="text-sm font-semibold text-slate-500">Suggested</h2>
          <div className="grid grid-cols-3 gap-3">
            {AVATAR_PRESETS.map((preset) => {
              const active = current === preset.id
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => choosePreset(preset.id)}
                  className={`relative flex flex-col items-center gap-1.5 rounded-xl bg-slate-50 p-3 ring-1 transition active:scale-[0.97] hover:bg-slate-100 ${
                    active ? 'ring-2 ring-brand-500' : 'ring-slate-200'
                  }`}
                  aria-pressed={active}
                  aria-label={preset.label}
                >
                  <span
                    className={`flex h-14 w-14 items-center justify-center rounded-full bg-white p-0.5 ring-2 ${
                      active ? 'ring-brand-500' : 'ring-slate-300'
                    }`}
                  >
                    <PresetAvatarFace
                      emoji={preset.emoji}
                      image={preset.image}
                      color={preset.color}
                      alt={preset.image ? preset.label : ''}
                    />
                  </span>
                  <span className="text-xs font-medium text-slate-600">{preset.label}</span>
                </button>
              )
            })}
          </div>
        </section>

        <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <h2 className="text-sm font-semibold text-slate-500">Custom photo</h2>
          <input
            ref={fileRef}
            type="file"
            accept={ALLOWED_TYPES.join(',')}
            className="hidden"
            onChange={(e) => {
              processFile(e.target.files?.[0])
              e.target.value = ''
            }}
          />
          <button
            type="button"
            disabled={loading}
            onClick={() => fileRef.current?.click()}
            className="w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? 'Loading…' : 'Choose photo from device'}
          </button>
          {(isCustomProfilePhoto(current) || current) && (
            <button
              type="button"
              onClick={removePhoto}
              className="w-full rounded-xl bg-slate-100 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-200 active:scale-[0.98]"
            >
              Reset to default (initial)
            </button>
          )}
          {error && (
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600 ring-1 ring-rose-200">{error}</p>
          )}
        </section>

        <Link
          to="/more"
          className="block w-full rounded-full bg-brand-100 py-3 text-center text-sm font-semibold text-brand-700 transition hover:bg-brand-200 active:scale-[0.98]"
        >
          Back to profile
        </Link>
      </div>
    </div>
  )
}
