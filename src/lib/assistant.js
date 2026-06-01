// Offline "AI" assistant for the shopping list.
//
// Fully in the browser, without a backend or API key (see README: guaranteed-to-
// work demo). The assistant does two things:
//   1. Recognizes dishes ("spaghetti bolognese", "salad", "breakfast") and
//      translates them into the ingredients you need for them.
//   2. Recognizes loose ingredients you mention ("milk, cheese and tomatoes").
//
// IMPORTANT: the assistant does not yet link stores or concrete products. It
// produces abstract *ingredient terms* that land on the list. Only when the
// customer picks a store does `pickBestProduct` match each term against that
// store's assortment (see StoreContext.resolveCartForStore).
import { fuzzySearchProducts } from './fuzzySearch.js'

function normalize(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

// Loose ingredient keywords -> a canonical term for the list.
// Each `words` list are synonyms/colloquialisms; `term` is what lands on the list.
const INGREDIENT_KEYWORDS = [
  { words: ['spaghetti'], term: 'spaghetti' },
  { words: ['penne'], term: 'penne' },
  { words: ['lasagne', 'lasagna', 'lasagne sheets'], term: 'lasagne sheets' },
  { words: ['pasta', 'macaroni', 'fusilli'], term: 'penne' },
  { words: ['bread', 'sandwich', 'sandwiches'], term: 'bread' },
  { words: ['baguette'], term: 'baguette' },
  { words: ['croissant', 'croissants'], term: 'croissants' },
  { words: ['jam', 'marmalade'], term: 'jam' },
  { words: ['muesli', 'granola', 'cereal', 'cornflakes'], term: 'muesli' },
  { words: ['milk'], term: 'milk' },
  { words: ['cheese'], term: 'cheese' },
  { words: ['yoghurt', 'yogurt'], term: 'yoghurt' },
  { words: ['soy', 'soya', 'soy drink', 'soy milk'], term: 'soy drink' },
  { words: ['coffee'], term: 'coffee' },
  { words: ['tea'], term: 'tea' },
  { words: ['cola'], term: 'cola' },
  { words: ['water', 'sparkling water', 'still water'], term: 'water' },
  { words: ['apple juice', 'juice'], term: 'apple juice' },
  { words: ['crisps', 'chips'], term: 'crisps' },
  { words: ['nuts'], term: 'nuts' },
  { words: ['chocolate', 'choco'], term: 'chocolate' },
  { words: ['apple', 'apples'], term: 'apples' },
  { words: ['banana', 'bananas'], term: 'bananas' },
  { words: ['tomato', 'tomatoes'], term: 'tomatoes' },
  { words: ['lettuce', 'salad', 'greens'], term: 'lettuce' },
  { words: ['vegetable', 'vegetables', 'veggies'], term: 'vegetables' },
  { words: ['mince', 'ground beef', 'minced beef'], term: 'ground beef' },
  { words: ['chicken', 'chicken breast'], term: 'chicken' },
  { words: ['bacon'], term: 'bacon' },
  { words: ['meat'], term: 'meat' },
  { words: ['fish', 'salmon'], term: 'salmon' },
]

// Nicer display names for the list; fall back to the term with a capital letter.
const TERM_LABELS = {
  penne: 'Pasta (penne)',
  'lasagne sheets': 'Lasagne sheets',
  'soy drink': 'Soy drink',
  'apple juice': 'Apple juice',
  'ground beef': 'Ground beef',
  chicken: 'Chicken',
  salmon: 'Fish (salmon)',
  lettuce: 'Lettuce',
  vegetables: 'Vegetables',
}

export function labelForTerm(term) {
  return TERM_LABELS[term] || term.charAt(0).toUpperCase() + term.slice(1)
}

// Build a list item for an ingredient term.
export function ingredientItem(term) {
  return { key: term, kind: 'ingredient', label: labelForTerm(term) }
}

// Broad themes the questionnaire opens with. Each dish belongs to one or more
// themes, so after a broad choice we can suggest concrete dishes.
export const THEMES = [
  { id: 'italian', label: 'Italian', emoji: '🍝' },
  { id: 'classic', label: 'Classics', emoji: '🍗' },
  { id: 'healthy', label: 'Healthy & light', emoji: '🥗' },
  { id: 'quick', label: 'Quick & simple', emoji: '⏱️' },
  { id: 'breakfast', label: 'Breakfast & brunch', emoji: '☀️' },
]

// Meal moments and base-ingredient categories the questionnaire uses to rank
// dishes. The labels are shown in the signup flow.
export const MEALS = [
  { id: 'breakfast', label: 'Breakfast', emoji: '🥐' },
  { id: 'lunch', label: 'Lunch', emoji: '🥪' },
  { id: 'dinner', label: 'Dinner', emoji: '🍽️' },
  { id: 'salad', label: 'Salad', emoji: '🥗' },
  { id: 'dessert', label: 'Dessert', emoji: '🍰' },
]

export const BASE_INGREDIENTS = [
  { id: 'pasta', label: 'Pasta', emoji: '🍝' },
  { id: 'beef', label: 'Beef', emoji: '🥩' },
  { id: 'chicken', label: 'Chicken', emoji: '🍗' },
  { id: 'fish', label: 'Fish', emoji: '🐟' },
  { id: 'vegetables', label: 'Vegetables', emoji: '🥦' },
  { id: 'cheese', label: 'Cheese & dairy', emoji: '🧀' },
  { id: 'bread', label: 'Bread', emoji: '🍞' },
  { id: 'fruit', label: 'Fruit', emoji: '🍎' },
]

// Cook-time choices; `max` = upper bound in minutes that recipes are filtered by.
export const COOK_TIME_OPTIONS = [
  { id: 'quick', label: 'Quick', sub: '< 15 min', emoji: '⚡', max: 15 },
  { id: 'medium', label: 'Medium', sub: '15 – 30 min', emoji: '⏱️', max: 30 },
  { id: 'elaborate', label: 'Elaborate', sub: '30 – 60 min', emoji: '🍳', max: 60 },
  { id: 'no-rush', label: 'No rush', sub: '60 min +', emoji: '🕯️', max: Infinity },
]

// Dishes -> the ingredient terms they need. Not every term is in every (limited)
// demo assortment; whatever a dish definitely lacks is listed in `missing` and
// reported nicely.
//
// Extra metadata drives the questionnaire (SignupPage):
//   time     = preparation time in minutes (hard filter on the chosen cook time)
//   diet     = which diet preferences this dish respects (hard filter)
//   meals    = which meal moments it fits (ranking)
//   base     = base-ingredient categories (ranking)
//   priceTier= price tier (ranking)
export const RECIPES = [
  { name: 'spaghetti bolognese', emoji: '🍝', themes: ['italian', 'classic'], aliases: ['spaghetti bolognese', 'bolognese', 'spaghetti'], ingredients: ['spaghetti', 'ground beef', 'tomatoes', 'cheese'], missing: ['onion', 'garlic'], time: 25, diet: [], meals: ['dinner'], base: ['pasta', 'beef', 'vegetables', 'cheese'], priceTier: 'mid' },
  { name: 'spaghetti carbonara', emoji: '🥓', themes: ['italian'], aliases: ['carbonara'], ingredients: ['spaghetti', 'bacon', 'cheese'], missing: ['eggs'], time: 20, diet: [], meals: ['dinner'], base: ['pasta', 'cheese'], priceTier: 'mid' },
  { name: 'lasagna', emoji: '🧀', themes: ['italian', 'classic'], aliases: ['lasagna', 'lasagne'], ingredients: ['lasagne sheets', 'ground beef', 'tomatoes', 'cheese'], missing: ['bechamel'], time: 45, diet: [], meals: ['dinner'], base: ['pasta', 'beef', 'vegetables', 'cheese'], priceTier: 'mid' },
  { name: 'pasta with tomato sauce', emoji: '🍅', themes: ['italian', 'quick'], aliases: ['pasta', 'macaroni', 'penne'], ingredients: ['penne', 'tomatoes', 'cheese'], missing: [], time: 15, diet: ['Vegetarian'], meals: ['dinner', 'lunch'], base: ['pasta', 'vegetables', 'cheese'], priceTier: 'budget' },
  { name: 'chicken with vegetables', emoji: '🍗', themes: ['classic', 'healthy'], aliases: ['chicken with vegetables', 'grilled chicken', 'chicken'], ingredients: ['chicken', 'vegetables'], missing: ['potatoes'], time: 30, diet: ['Gluten-free', 'Lactose-free', 'Sugar-free'], meals: ['dinner'], base: ['chicken', 'vegetables'], priceTier: 'mid' },
  { name: 'salmon with vegetables', emoji: '🐟', themes: ['healthy', 'classic'], aliases: ['salmon', 'fish'], ingredients: ['salmon', 'vegetables'], missing: ['lemon'], time: 25, diet: ['Gluten-free', 'Lactose-free', 'Sugar-free'], meals: ['dinner'], base: ['fish', 'vegetables'], priceTier: 'premium' },
  { name: 'fresh salad', emoji: '🥗', themes: ['healthy', 'quick'], aliases: ['salad', 'side salad', 'lettuce'], ingredients: ['lettuce', 'tomatoes', 'cheese', 'chicken'], missing: ['dressing'], time: 10, diet: ['Gluten-free'], meals: ['salad', 'lunch'], base: ['vegetables', 'chicken', 'cheese'], priceTier: 'mid' },
  { name: 'sandwich lunch', emoji: '🥪', themes: ['quick', 'breakfast'], aliases: ['sandwiches', 'lunch', 'sandwich', 'bread meal'], ingredients: ['bread', 'cheese'], missing: ['ham'], time: 5, diet: ['Vegetarian'], meals: ['lunch', 'breakfast'], base: ['bread', 'cheese'], priceTier: 'budget' },
  { name: 'big breakfast', emoji: '🥐', themes: ['breakfast'], aliases: ['breakfast', 'brunch'], ingredients: ['bread', 'jam', 'coffee'], missing: ['eggs'], time: 15, diet: ['Vegetarian'], meals: ['breakfast'], base: ['bread'], priceTier: 'budget' },
  { name: 'fruit smoothie', emoji: '🥤', themes: ['healthy', 'breakfast'], aliases: ['smoothie', 'smoothies'], ingredients: ['bananas', 'apples', 'yoghurt'], missing: [], time: 5, diet: ['Vegetarian', 'Gluten-free'], meals: ['breakfast', 'dessert'], base: ['fruit', 'cheese'], priceTier: 'budget' },
]

// All dishes that belong to at least one of the chosen themes.
// Central recipe recommendation, shared by the signup questionnaire and the chef chat.
// Hard filter on diet, cook time and avoided ingredients; then rank on how well a
// recipe matches the cuisine style, the meal moment, the desired ingredients and the
// price tier. That keeps the best matches on top without the list unexpectedly
// running empty.
export function rankRecipes({
  diet = [],
  cookTime = '',
  avoid = [],
  themes = [],
  meals = [],
  ingredients = [],
  priceTier = '',
} = {}) {
  const maxTime = COOK_TIME_OPTIONS.find((k) => k.id === cookTime)?.max ?? Infinity
  const priceLower = (priceTier || '').toLowerCase()

  return RECIPES.filter((r) => diet.every((d) => r.diet.includes(d)))
    .filter((r) => r.time <= maxTime)
    .filter((r) => !avoid.some((v) => r.base.includes(v)))
    .map((r) => {
      let score = 0
      score += themes.filter((t) => r.themes.includes(t)).length * 2
      score += meals.filter((m) => r.meals.includes(m)).length * 2
      score += ingredients.filter((i) => r.base.includes(i)).length * 2
      if (priceLower && r.priceTier === priceLower) score += 1
      return { ...r, score }
    })
    .sort((a, b) => b.score - a.score)
}

// ── Chef conversation ────────────────────────────────────────────────────────
// The chat runs the questionnaire as a conversation: the chef asks questions
// step by step ("follow-up") and suggests dishes at the end. Each answer lands
// in `preferences` and feeds rankRecipes().

export const CHEF_GREETING =
  "Hi, I'm your chef! Tell me what you're in the mood for — type or speak freely — and I'll ask a few questions and find the right dishes together with you. Shall we start?"

// Build quick-reply options from a data list (THEMES, BASE_INGREDIENTS, …).
const mapOptions = (list) => list.map((o) => ({ id: o.id, label: o.label, emoji: o.emoji }))

// The question script. `multi` = multiple answers, `skippable` = may be empty.
// `key` is the field in the preferences that rankRecipes() reads.
export const CHEF_QUESTIONS = [
  { key: 'cookTime', multi: false, question: 'How much time do you have to cook today?', options: mapOptions(COOK_TIME_OPTIONS) },
  {
    key: 'servings',
    multi: false,
    question: 'How many people are you cooking for?',
    options: [
      { id: '1', label: 'Just me', emoji: '🧑' },
      { id: '2', label: 'Two', emoji: '👫' },
      { id: '3-4', label: '3 – 4', emoji: '👨‍👩‍👧' },
      { id: '5+', label: '5 or more', emoji: '👨‍👩‍👧‍👦' },
    ],
  },
  { key: 'themes', multi: true, question: 'What are you in the mood for? Feel free to pick multiple cuisines.', options: mapOptions(THEMES) },
  { key: 'meals', multi: true, skippable: true, question: 'For which moment of the day?', options: mapOptions(MEALS) },
  { key: 'ingredients', multi: true, skippable: true, question: 'Are there ingredients you like to work with?', options: mapOptions(BASE_INGREDIENTS) },
  { key: 'avoid', multi: true, skippable: true, question: 'And anything I should leave out?', options: mapOptions(BASE_INGREDIENTS) },
]

// A chef-like reaction to a given answer, before the next question.
export function chefReply(key, labels) {
  const part = joinList(labels).toLowerCase()
  switch (key) {
    case 'cookTime':
      return `Great — I'll keep "${part}" in mind.`
    case 'servings':
      return labels[0] === 'Just me' ? 'Cooking just for yourself, nice too!' : `Noted, cooking for ${part}.`
    case 'themes':
      return labels.length ? `Mmm, ${part} — I can work with that!` : "No preference? Then I'll surprise you later."
    case 'meals':
      return labels.length ? `Clear, for ${part} then.` : "Doesn't matter when — fine."
    case 'ingredients':
      return labels.length ? `Nice, I love working with ${part}.` : "Okay, I'll keep all options open."
    case 'avoid':
      return labels.length ? `Understood — I'll leave out ${part}.` : 'Nothing to avoid, that makes it easy.'
    default:
      return 'Noted!'
  }
}

// Recognize which options of a question appear in free text (chips are primary,
// but anyone who prefers typing — "something quick with chicken" — is understood too).
export function recognizeChoices(options, text) {
  const t = normalize(text)
  const words = new Set(t.split(/[^a-z]+/).filter((w) => w.length >= 3))
  return options.filter((o) => {
    if (words.has(normalize(o.id))) return true
    const labelWords = normalize(o.label).split(/[^a-z]+/).filter((w) => w.length >= 4)
    return labelWords.some((lw) => words.has(lw))
  })
}

// The ingredient terms for a set of chosen dishes (store-independent).
// Also returns which ingredients no recipe has in stock.
export function ingredientsForDishes(recipes) {
  const terms = []
  const seen = new Set()
  const notFound = new Set()
  for (const r of recipes) {
    r.missing?.forEach((o) => notFound.add(o))
    for (const term of r.ingredients) {
      if (!seen.has(term)) {
        seen.add(term)
        terms.push(term)
      }
    }
  }
  return { terms, notFound: [...notFound] }
}

// Pick the best matching product for one ingredient term from a given pool.
export function pickBestProduct(pool, term) {
  const matches = fuzzySearchProducts(pool || [], term)
  if (!matches.length) return null

  return [...matches].sort((a, b) => {
    const as = a.onShelf === false ? 1 : 0
    const bs = b.onShelf === false ? 1 : 0
    if (as !== bs) return as - bs
    return a.price - b.price
  })[0]
}

// Does `needle` appear as a whole word (or phrase) in `haystack`?
function containsWord(haystack, needle) {
  if (needle.includes(' ')) return haystack.includes(needle)
  return new RegExp(`(^|[^a-z])${needle}([^a-z]|$)`).test(haystack)
}

const PLURALS = {
  ingredient: (n) => (n === 1 ? 'ingredient' : 'ingredients'),
}

/**
 * Process a message from the user (typed or spoken).
 * @returns {{reply:string, items:{key,kind,label}[],
 *            notFound:string[], dishes:string[], suggestions:string[]}}
 */
export function processMessage(text) {
  const t = normalize(text)
  if (!t.trim()) {
    return emptyReply('Feel free to say or type what you want to eat or need — for example "spaghetti bolognese" or "milk, cheese and apples".')
  }

  // 1. Recognize dishes.
  const dishes = RECIPES.filter((r) => r.aliases.some((a) => containsWord(t, normalize(a))))

  // 2. Gather ingredient terms: from dishes + loose keywords.
  const terms = []
  const seen = new Set()
  const missingIngredients = new Set()
  for (const r of dishes) {
    r.ingredients.forEach((i) => {
      if (!seen.has(i)) {
        seen.add(i)
        terms.push(i)
      }
    })
    r.missing.forEach((o) => missingIngredients.add(o))
  }
  for (const k of INGREDIENT_KEYWORDS) {
    if (k.words.some((w) => containsWord(t, normalize(w))) && !seen.has(k.term)) {
      seen.add(k.term)
      terms.push(k.term)
    }
  }

  // 3. Build a conversational reply.
  if (!terms.length) {
    return emptyReply(
      'Hmm, I don\'t recognize that as a dish or ingredient. Try something like "lasagna" or "salad", or name ingredients like "chicken and tomatoes".',
    )
  }

  const items = terms.map(ingredientItem)
  const labels = items.map((i) => i.label.toLowerCase())
  const notFound = [...missingIngredients]

  let reply = ''
  if (dishes.length) {
    const dishNames = dishes.map((g) => g.name)
    reply = `Tasty! For ${joinList(dishNames)} I'll put ${labels.length} ${PLURALS.ingredient(labels.length)} on your list: ${joinList(labels)}.`
  } else {
    reply = `Added to your list: ${joinList(labels)}.`
  }
  if (notFound.length) {
    reply += ` ${capitalize(joinList(notFound))} ${notFound.length === 1 ? 'is' : 'are'} not in our recipes — you can add those yourself.`
  }

  const suggestions = buildSuggestions(seen)
  if (suggestions.length) {
    reply += ` Want anything else, like ${joinList(suggestions.map((s) => s.toLowerCase()))}?`
  }

  return { reply, items, notFound, dishes: dishes.map((g) => g.name), suggestions }
}

// Suggest at most 2 additional ingredients not yet on the list.
// The labels are immediately recognizable words, so a tap adds them.
function buildSuggestions(seenTerms) {
  const options = [
    { term: 'coffee', label: 'Coffee' },
    { term: 'apples', label: 'Apples' },
    { term: 'chocolate', label: 'Chocolate' },
    { term: 'cola', label: 'Cola' },
  ]
  return options
    .filter((o) => !seenTerms.has(o.term))
    .slice(0, 2)
    .map((o) => o.label)
}

function emptyReply(reply) {
  return { reply, items: [], notFound: [], dishes: [], suggestions: [] }
}

function joinList(items) {
  const arr = items.filter(Boolean)
  if (arr.length === 0) return ''
  if (arr.length === 1) return arr[0]
  return `${arr.slice(0, -1).join(', ')} and ${arr[arr.length - 1]}`
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}
