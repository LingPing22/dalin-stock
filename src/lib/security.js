// App lock: owner / staff PINs, wrong-PIN lockout and auto-lock.
// PIN settings are stored apart from the shop data, so they are NOT inside
// backup files — a forgotten PIN can be recovered by reinstalling and
// restoring a backup, and a backup file never carries the PIN.
import { useEffect, useSyncExternalStore } from 'react'
import { loadKey, saveKey } from './storage.js'
import { hashPin, randomSalt, isValidPin, PIN_ITER } from './pinhash.js'

const KEY = 'dalin-stock:security'
const ATTEMPTS_KEY = 'dalin-stock:pin-attempts'
export const MAX_FAILS = 5
export const LOCKOUT_MS = 60_000
export const AUTO_LOCK_CHOICES = [1, 5, 15, 30]

const DEFAULT_CONFIG = { owner: null, staff: null, autoLockMin: 5 }

let sec = { ready: false, config: { ...DEFAULT_CONFIG }, role: 'owner' }
const listeners = new Set()
const emit = () => listeners.forEach((l) => l())
const subscribe = (l) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function getSecurity() {
  return sec
}
export function useSecurity() {
  return useSyncExternalStore(subscribe, getSecurity)
}
/** 'owner' | 'staff' | null (locked) */
export function useRole() {
  return useSecurity().role
}
export function pinEnabled(s = sec) {
  return !!s.config.owner
}
export function isLocked(s = sec) {
  return pinEnabled(s) && !s.role
}

export async function initSecurity() {
  const saved = await loadKey(KEY)
  const config = { ...DEFAULT_CONFIG, ...(saved || {}) }
  sec = { ready: true, config, role: config.owner ? null : 'owner' }
  emit()
}

async function saveConfig(config) {
  sec = { ...sec, config }
  emit()
  return saveKey(KEY, config)
}

// ───────────── wrong-PIN counter (survives a page reload) ─────────────
let memAttempts = { fails: 0, until: 0 }
function readAttempts() {
  try {
    return JSON.parse(localStorage.getItem(ATTEMPTS_KEY)) || memAttempts
  } catch {
    return memAttempts
  }
}
function writeAttempts(a) {
  memAttempts = a
  try {
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(a))
  } catch {
    /* memory only */
  }
}
export function lockoutRemaining() {
  return Math.max(0, readAttempts().until - Date.now())
}

const matches = (pin, entry) => !!entry && hashPin(pin, entry.salt, entry.iter || PIN_ITER) === entry.hash
const makeEntry = (pin) => {
  const salt = randomSalt()
  return { salt, iter: PIN_ITER, hash: hashPin(pin, salt, PIN_ITER) }
}

/**
 * Try a PIN on the lock screen.
 * → { ok: true, role } | { ok: false, left } | { ok: false, lockedMs }
 */
export function tryUnlock(pin) {
  const wait = lockoutRemaining()
  if (wait > 0) return { ok: false, lockedMs: wait }
  const { owner, staff } = sec.config
  const role = matches(pin, owner) ? 'owner' : matches(pin, staff) ? 'staff' : null
  if (role) {
    writeAttempts({ fails: 0, until: 0 })
    sec = { ...sec, role }
    emit()
    return { ok: true, role }
  }
  const fails = (readAttempts().fails || 0) + 1
  if (fails >= MAX_FAILS) {
    writeAttempts({ fails: 0, until: Date.now() + LOCKOUT_MS })
    return { ok: false, lockedMs: LOCKOUT_MS }
  }
  writeAttempts({ fails, until: 0 })
  return { ok: false, left: MAX_FAILS - fails }
}

export function lockNow() {
  if (!pinEnabled()) return
  sec = { ...sec, role: null }
  emit()
}

export function verifyOwnerPin(pin) {
  return matches(pin, sec.config.owner)
}

// ───────────── owner-only changes ─────────────

/** Returns an error message (Lao) or null. */
export function checkNewPin(pin, confirm, { notSameAs } = {}) {
  if (!isValidPin(pin)) return 'PIN ຕ້ອງເປັນຕົວເລກ 4–6 ຕົວ'
  if (pin !== confirm) return 'PIN ທັງສອງຊ່ອງບໍ່ກົງກັນ'
  if (/^(\d)\1+$/.test(pin) || '0123456789'.includes(pin) || '9876543210'.includes(pin)) return 'PIN ນີ້ເດົາງ່າຍເກີນໄປ (ເຊັ່ນ 1111, 1234) — ລອງຕົວເລກອື່ນ'
  if (notSameAs && matches(pin, notSameAs)) return 'PIN ພະນັກງານ ຕ້ອງບໍ່ຊ້ຳກັບ PIN ເຈົ້າຂອງ'
  return null
}

export function setOwnerPin(pin) {
  const config = { ...sec.config, owner: makeEntry(pin) }
  // the staff PIN must stay different from the owner's
  if (matches(pin, config.staff)) config.staff = null
  sec = { ...sec, role: 'owner' }
  return saveConfig(config)
}

export function setStaffPin(pin) {
  return saveConfig({ ...sec.config, staff: makeEntry(pin) })
}

export function removeStaffPin() {
  return saveConfig({ ...sec.config, staff: null })
}

export function disablePin() {
  sec = { ...sec, role: 'owner' }
  return saveConfig({ ...sec.config, owner: null, staff: null })
}

export function setAutoLock(min) {
  return saveConfig({ ...sec.config, autoLockMin: min })
}

/** Lock after N minutes without a touch, and when coming back to the app after that long. */
export function useAutoLock() {
  const s = useSecurity()
  const active = pinEnabled(s) && !!s.role
  const minutes = s.config.autoLockMin || 5
  useEffect(() => {
    if (!active) return
    let last = Date.now()
    const bump = () => {
      last = Date.now()
    }
    const check = () => {
      if (Date.now() - last >= minutes * 60_000) lockNow()
    }
    const onVisible = () => document.visibilityState === 'visible' && check()
    const events = ['pointerdown', 'keydown', 'touchstart', 'wheel']
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }))
    document.addEventListener('visibilitychange', onVisible)
    const timer = setInterval(check, 10_000)
    return () => {
      events.forEach((e) => window.removeEventListener(e, bump))
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(timer)
    }
  }, [active, minutes])
}
