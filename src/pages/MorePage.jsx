import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../context/StoreContext.jsx'
import PageHeader from '../components/PageHeader.jsx'
import ProfileAvatar from '../components/ProfileAvatar.jsx'

function Field({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-400">{label}</span>
      <input
        type={type}
        value={value || ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-brand-400"
      />
    </label>
  )
}

export default function MorePage() {
  const { activeProfile, updateProfile, logout } = useStore()
  const navigate = useNavigate()
  const person = activeProfile.person || {}

  return (
    <div>
      <PageHeader title="Profile" subtitle="Your account details" />

      <div className="space-y-5 px-4 py-4">
        <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <Link to="/profile-photo" className="shrink-0 transition active:scale-95" aria-label="Change profile photo">
            <ProfileAvatar profile={activeProfile} size="md" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-slate-800">{activeProfile.name}</p>
            <p className="text-xs text-slate-500">{person.email || activeProfile.description}</p>
            <Link to="/profile-photo" className="mt-1 inline-block text-xs font-semibold text-brand-600 hover:text-brand-700">
              Change profile photo →
            </Link>
          </div>
        </div>

        <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
          <h2 className="text-sm font-semibold text-slate-500">Personal details</h2>
          <Field label="Name" value={activeProfile.name} onChange={(x) => updateProfile({ name: x })} />
          <Field label="Email" type="email" value={person.email} onChange={(x) => updateProfile({ person: { email: x } })} />
          <Field label="Phone" value={person.phone} onChange={(x) => updateProfile({ person: { phone: x } })} />
          <Field label="Address" value={person.address} onChange={(x) => updateProfile({ person: { address: x } })} />
        </section>

        <button
          onClick={() => {
            logout()
            navigate('/login')
          }}
          className="w-full rounded-full bg-brand-100 py-3 text-sm font-semibold text-brand-700 transition hover:bg-brand-200 active:scale-[0.98]"
        >
          Log out
        </button>
      </div>
    </div>
  )
}
