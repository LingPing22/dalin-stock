// Tiny hash router: #/page?key=value. Hash URLs never hit the server, so
// GitHub Pages can't answer "404 Not Found" on refresh.
import { useEffect, useState } from 'react'

export const PAGES = ['dashboard', 'sell', 'lots', 'expenses', 'settings']

function parse() {
  const raw = window.location.hash.replace(/^#\/?/, '')
  const [path, query] = raw.split('?')
  const page = PAGES.includes(path) ? path : 'dashboard'
  return { page, params: Object.fromEntries(new URLSearchParams(query || '')) }
}

export function useRoute() {
  const [route, setRoute] = useState(parse)
  useEffect(() => {
    const on = () => {
      setRoute(parse())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}

export function go(page, params) {
  const q = params ? '?' + new URLSearchParams(params).toString() : ''
  window.location.hash = `#/${page}${q}`
}
