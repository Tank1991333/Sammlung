import { useEffect, useState } from 'react'

const KEY = 'zwei-euro-theme' // Einstellung pro Gerät: 'auto', 'hell' oder 'dunkel'

function systemDark() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true
}

export function useTheme() {
  const [pref, setPref] = useState(() => {
    try { return localStorage.getItem(KEY) || 'auto' } catch (e) { return 'auto' }
  })
  const [sysDark, setSysDark] = useState(systemDark)

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mq) return
    const onChange = (e) => setSysDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const effective = pref === 'auto' ? (sysDark ? 'dunkel' : 'hell') : pref

  useEffect(() => {
    document.documentElement.dataset.theme = effective === 'hell' ? 'light' : 'dark'
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', effective === 'hell' ? '#F5F1E8' : '#1E2B47')
    try { localStorage.setItem(KEY, pref) } catch (e) { /* egal */ }
  }, [pref, effective])

  return { pref, setPref, effective, toggle: () => setPref(effective === 'hell' ? 'dunkel' : 'hell') }
}
