// Mock profiles. Each profile drives personalization: the preferences determine
// the order of stores, search results, alternatives and deals.
// "Guest" has no preferences -> the app falls back to distance/alphabetical.

export const profiles = [
  {
    id: 'sander',
    name: 'Sander',
    type: 'member',
    description: 'Premium · gluten-free',
    color: '#7c3aed',
    person: { email: 'sander@example.be', phone: '0470 12 34 56', address: 'Korenmarkt 12, 9000 Ghent' },
    preferences: {
      departments: ['groceries', 'electronics'],
      brands: ['Schär', 'Lavazza', 'Apple', 'Alpro'],
      diet: ['gluten-free'],
      priceTier: 'premium',
    },
    loyaltyPoints: 1240,
    cashbackBalance: 18.5,
    cashbackTier: 'Premium',
  },
  {
    id: 'marc',
    name: 'Marc',
    type: 'member',
    description: 'Family · budget-conscious',
    color: '#0ea5e9',
    person: { email: 'marc@example.be', phone: '0498 65 43 21', address: 'Veldstraat 5, 9000 Ghent' },
    preferences: {
      departments: ['groceries', 'toys'],
      brands: ['Boni', 'Lego', 'Coca-Cola'],
      diet: [],
      priceTier: 'budget',
    },
    loyaltyPoints: 540,
    cashbackBalance: 7.2,
    cashbackTier: 'Standard',
  },
  {
    id: 'guest',
    name: 'Guest',
    type: 'guest',
    description: 'No personalization',
    color: '#64748b',
    preferences: null,
    loyaltyPoints: 0,
    cashbackBalance: 0,
    cashbackTier: '—',
  },
]

export function getProfile(id) {
  return profiles.find((p) => p.id === id) || null
}
