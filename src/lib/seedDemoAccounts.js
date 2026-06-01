import { getAccounts, saveAccount } from '../context/StoreContext.jsx'
import { hashPassword } from './security.js'

const DEMO_SEED_KEY = 'storenav.demoAccountsSeed'
const DEMO_SEED_VERSION = '1'

export const DEMO_EMAIL = 'demo@demo.com'
export const DEMO_PASSWORD = 'demo'

function buildCustomerProfile() {
  return {
    id: DEMO_EMAIL,
    name: 'Demo',
    type: 'member',
    description: 'Demo account',
    color: '#7c3aed',
    person: { email: DEMO_EMAIL, phone: '', address: '' },
    preferences: {
      diet: [],
      priceTier: 'budget',
      brands: [],
      departments: [],
    },
    loyaltyPoints: 0,
    cashbackBalance: 0,
    cashbackTier: 'Standard',
  }
}

/** Ensures the shared demo login (1234@1234 / 1234) exists for customer and manager flows. */
export async function seedDemoAccounts() {
  if (localStorage.getItem(DEMO_SEED_KEY) === DEMO_SEED_VERSION) return

  const email = DEMO_EMAIL.toLowerCase()
  if (getAccounts()[email]) {
    localStorage.setItem(DEMO_SEED_KEY, DEMO_SEED_VERSION)
    return
  }

  const password = await hashPassword(DEMO_PASSWORD)
  saveAccount(email, {
    password,
    profile: buildCustomerProfile(),
    managerId: 'mgr-ah-xl',
    storeId: 'ah-xl',
  })
  localStorage.setItem(DEMO_SEED_KEY, DEMO_SEED_VERSION)
}
