import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Compass } from '../components/icons.jsx'
import { useStore, getAccounts, saveAccount } from '../context/StoreContext.jsx'
import { hashPassword, MAX_PASSWORD_LENGTH } from '../lib/security.js'
import { Button, Input } from '../components/ui/index.js'

const ACCENT_COLOR = '#7c3aed'

export default function SignupPage() {
  const { login } = useStore()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function validate() {
    const trimmedName = name.trim()
    if (!trimmedName) return 'Enter your name.'
    const letterCount = (trimmedName.match(/\p{L}/gu) || []).length
    if (letterCount < 2) return 'Your name must contain at least 2 letters.'

    const trimmedEmail = email.trim()
    if (!trimmedEmail) return 'Enter your email address.'
    if (!trimmedEmail.includes('@')) return "Make sure it's a valid email address."

    if (!password) return 'Enter a password.'
    if (password.length < 7) return 'Password must contain at least 7 characters.'
    if (password.length > MAX_PASSWORD_LENGTH) return 'Password is too long (max. 128 characters).'

    if (getAccounts()[trimmedEmail.toLowerCase()]) {
      return 'An account with this email address already exists.'
    }
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    setError('')
    try {
      const emailLower = email.trim().toLowerCase()
      const profile = {
        id: emailLower,
        name: name.trim(),
        type: 'member',
        description: 'Customer account',
        color: ACCENT_COLOR,
        person: { email: emailLower, phone: '', address: '' },
      }
      const passwordHash = await hashPassword(password)
      saveAccount(emailLower, { password: passwordHash, profile })
      login(profile)
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-surface px-5 py-8">
      <div className="w-full max-w-md space-y-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-md shadow-brand-600/25">
            <Compass className="h-4.5 w-4.5" strokeWidth={1.8} />
          </div>
          <span className="text-base font-bold text-slate-900">Never Lost</span>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Create your account</h2>
          <p className="mt-0.5 text-sm text-slate-500">Sign up to save your profile and shopping list.</p>

          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <Input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" aria-label="Name" autoComplete="name" />
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" aria-label="Email address" autoComplete="email" />
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min. 7 characters)"
              aria-label="Password"
              autoComplete="new-password"
            />

            {error && (
              <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 ring-1 ring-rose-200">{error}</div>
            )}

            <Button type="submit" size="lg" disabled={loading} className="w-full">
              {loading ? 'Working…' : 'Create account'}
            </Button>
          </form>

          <p className="mt-4 text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-brand-600 transition hover:text-brand-700">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
