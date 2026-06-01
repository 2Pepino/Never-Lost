function normalize(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

function levenshtein(a, b) {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length

  const row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j]
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = tmp
    }
  }
  return row[b.length]
}

function scoreText(text, query) {
  const t = normalize(text)
  const q = normalize(query)
  if (!q) return 100

  if (t.includes(q)) return 100 - t.indexOf(q) * 0.05

  const words = t.split(/\s+/).filter(Boolean)
  for (const w of words) {
    if (w.startsWith(q)) return 85
  }

  let best = levenshtein(q, t)
  for (const w of words) {
    if (w.length >= 2) best = Math.min(best, levenshtein(q, w))
  }

  const maxDistance = q.length <= 4 ? 1 : q.length <= 8 ? 2 : 3
  if (best <= maxDistance) return 70 - best * 12

  return 0
}

export function fuzzySearchProducts(products, query) {
  const q = query.trim()
  if (!q) return products

  return products
    .map((p) => {
      const fields = [p.name, p.category, p.id?.replace(/^[^-]+-/, '').replace(/-/g, ' ')]
      const score = Math.max(...fields.filter(Boolean).map((v) => scoreText(v, q)))
      return { product: p, score }
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ product }) => product)
}
