import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Compass } from '../components/icons.jsx'
import { useStore, getAccounts, saveAccount } from '../context/StoreContext.jsx'
import {
  clearLoginAttempts,
  getLoginLockout,
  hashPassword,
  isLegacyPassword,
  recordFailedLogin,
  verifyPassword,
} from '../lib/security.js'
import { AuthLayout, AuthLogo, Button, Input, Card } from '../components/ui/index.js'

export default function LoginPage() {
  const { login } = useStore()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const lockout = getLoginLockout()
    if (lockout.locked) {
      setError(`Too many attempts. Try again in ${lockout.secondsLeft} seconds.`)
      return
    }

    setLoading(true)
    const emailLower = email.trim().toLowerCase()

    try {
      const accounts = getAccounts()
      const account = accounts[emailLower]
      if (account?.profile && (await verifyPassword(password, account.password))) {
        clearLoginAttempts()
        if (isLegacyPassword(account.password)) {
          saveAccount(emailLower, { ...account, password: await hashPassword(password) })
        }
        login(account.profile, 'customer-account')
        navigate('/')
        return
      }

      recordFailedLogin()
      setError('Email or password is incorrect.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      logo={
        <AuthLogo>
          <Compass className="h-7 w-7" strokeWidth={1.8} />
        </AuthLogo>
      }
      title="Never Lost"
      subtitle={
        <>
          Your personalized store navigator
          <span className="mt-1 block font-medium text-brand-600">Shopping made easy, cooking made easy.</span>
        </>
      }
      footer={
        <Link to="/manage/login" className="underline underline-offset-2 transition hover:text-brand-600">
          Store manager login
        </Link>
      }
    >
      {/* Tabs */}
      <div className="flex gap-1 rounded-full bg-slate-100 p-1">
        <button className="flex-1 rounded-full bg-white py-2.5 text-sm font-semibold text-brand-700 shadow-sm">
          Log in
        </button>
        <Link
          to="/signup"
          className="flex-1 rounded-full py-2.5 text-center text-sm font-semibold text-slate-500 transition hover:text-slate-700"
        >
          Create account
        </Link>
      </div>

      {/* Form */}
      <Card className="space-y-3 p-6">
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            aria-label="Email address"
            autoComplete="email"
          />
          <Input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            aria-label="Password"
            autoComplete="current-password"
          />

          {error && (
            <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 ring-1 ring-rose-200">
              {error}
            </div>
          )}

          <Button type="submit" size="lg" disabled={loading} className="w-full">
            {loading ? 'Working…' : 'Log in'}
          </Button>
        </form>
      </Card>
    </AuthLayout>
  )
}
