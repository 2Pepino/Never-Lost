// Suggested profile photos — each with a background color that contrasts with the icon.
export const AVATAR_PRESETS = [
  { id: 'shop', label: 'Shop', emoji: '🛒', color: '#0ea5e9' },
  { id: 'user', label: 'User', emoji: '🧑', color: '#6366f1' },
  { id: 'green', label: 'Green', emoji: '🥗', color: '#f97316' },
  { id: 'fruit', label: 'Fruit', emoji: '🍎', color: '#2563eb' },
  { id: 'coffee', label: 'Coffee', emoji: '☕', color: '#14b8a6' },
  {
    id: 'oma',
    label: 'Grandma',
    image: '/avatars/oma.png',
    color: '#FFFFFF',
  },
  { id: 'home', label: 'Home', emoji: '🏠', color: '#ec4899' },
  { id: 'star', label: 'Star', emoji: '⭐', color: '#7c3aed' },
  { id: 'heart', label: 'Heart', emoji: '💜', color: '#22c55e' },
]

export function getAvatarPreset(id) {
  const lookupId = id === 'sport' ? 'oma' : id === 'chef' ? 'user' : id
  return AVATAR_PRESETS.find((p) => p.id === lookupId) || null
}
