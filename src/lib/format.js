// Formatting helpers: money (kip), quantities, Lao dates.

const groupFmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

/** 1250000 -> "1,250,000" */
export function money(n) {
  const v = Math.round(Number(n) || 0)
  return groupFmt.format(v)
}

/** 1250000 -> "1,250,000 ກີບ" */
export function kip(n) {
  return `${money(n)} ກີບ`
}

/** Signed: +25,000 / −176,000 */
export function signedKip(n) {
  const v = Math.round(Number(n) || 0)
  if (v === 0) return '0 ກີບ'
  return `${v > 0 ? '+' : '−'}${money(Math.abs(v))} ກີບ`
}

/** Round to 3 decimals to kill float noise (0.1 + 0.2). */
export function r3(n) {
  return Math.round((Number(n) || 0) * 1000) / 1000
}

/** Quantity for display: up to 2 decimals for weight, integers otherwise. */
export function qtyText(n, decimals = true) {
  const v = r3(n)
  if (!decimals) return groupFmt.format(Math.round(v * 100) / 100)
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(v)
}

const MONTHS = ['ມັງກອນ', 'ກຸມພາ', 'ມີນາ', 'ເມສາ', 'ພຶດສະພາ', 'ມິຖຸນາ', 'ກໍລະກົດ', 'ສິງຫາ', 'ກັນຍາ', 'ຕຸລາ', 'ພະຈິກ', 'ທັນວາ']
const MONTHS_SHORT = ['ມ.ກ.', 'ກ.ພ.', 'ມ.ນ.', 'ມ.ສ.', 'ພ.ພ.', 'ມິ.ຖ.', 'ກ.ລ.', 'ສ.ຫ.', 'ກ.ຍ.', 'ຕ.ລ.', 'ພ.ຈ.', 'ທ.ວ.']
const DAYS = ['ອາທິດ', 'ຈັນ', 'ອັງຄານ', 'ພຸດ', 'ພະຫັດ', 'ສຸກ', 'ເສົາ']

const pad = (n) => String(n).padStart(2, '0')

/** Local date key "YYYY-MM-DD" for a Date or timestamp. */
export function dayKey(d = new Date()) {
  const x = d instanceof Date ? d : new Date(d)
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`
}

export function todayKey() {
  return dayKey(new Date())
}

/** "YYYY-MM-DD" -> Date at local midnight */
export function keyToDate(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(key, n) {
  const d = keyToDate(key)
  d.setDate(d.getDate() + n)
  return dayKey(d)
}

/** "ພຸດ 18 ພະຈິກ 2026" */
export function dateLong(key) {
  const d = keyToDate(key)
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

/** "18 ພ.ຈ." */
export function dateShort(key) {
  const d = keyToDate(key)
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
}

/** "ມື້ນີ້" / "ມື້ວານ" / "ພຸດ 12 ພ.ຈ." */
export function dateRelative(key) {
  const t = todayKey()
  if (key === t) return 'ມື້ນີ້'
  if (key === addDays(t, -1)) return 'ມື້ວານ'
  const d = keyToDate(key)
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
}

export function timeText(ts) {
  const d = new Date(ts)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function daysBetween(fromKey, toKey) {
  return Math.round((keyToDate(toKey) - keyToDate(fromKey)) / 86400000)
}

/** Parse a user-typed number: strips thousand separators and spaces. */
export function parseNum(s) {
  if (typeof s === 'number') return s
  if (!s) return 0
  const clean = String(s).replace(/[\s,]/g, '').replace(/[^\d.]/g, '')
  const v = parseFloat(clean)
  return Number.isFinite(v) ? v : 0
}

export function uid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID()
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
