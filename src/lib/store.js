// App state + actions. Every change is saved to the device immediately.
import { useSyncExternalStore } from 'react'
import { loadData, saveData, wipeData, requestPersist } from './storage.js'
import { makeDemoData } from './demo.js'
import { uid, dayKey, r3 } from './format.js'

export const SCHEMA_VERSION = 1

export const DEFAULT_SETTINGS = {
  shopName: 'ຮ້ານຂອງຂ້ອຍ',
  rounding: 500, // ປັດເສດຍອດເງິນ: 0 | 100 | 500 | 1000
}

function emptyState() {
  return {
    version: SCHEMA_VERSION,
    settings: { ...DEFAULT_SETTINGS },
    batches: [],
    moves: [],
    expenses: [],
    meta: { createdAt: Date.now(), lastBackupAt: null, demoCleared: false },
  }
}

let state = null
let saveError = false
const listeners = new Set()

function emit() {
  for (const l of listeners) l()
}

async function persist() {
  const ok = await saveData(state)
  if (ok === saveError) {
    saveError = !ok
    emit()
  }
}

function commit(next) {
  state = next
  emit()
  persist()
}

export function getState() {
  return state
}

export function subscribe(l) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useAppState() {
  return useSyncExternalStore(subscribe, getState)
}

export function hasSaveError() {
  return saveError
}

/** Load from the device; on very first launch fill in sample data. */
export async function initStore() {
  let data = null
  try {
    data = await loadData()
  } catch {
    data = null
  }
  if (data && Array.isArray(data.batches)) {
    state = normalize(data)
  } else {
    state = emptyState()
    const demo = makeDemoData()
    state.batches = demo.batches
    state.moves = demo.moves
    state.expenses = demo.expenses
    state.settings.shopName = 'ຮ້ານຕົວຢ່າງ'
    await saveData(state)
  }
  emit()
  requestPersist()
  return state
}

/** Make imported / older data safe to use. */
export function normalize(data) {
  const base = emptyState()
  const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0)
  return {
    version: SCHEMA_VERSION,
    settings: { ...base.settings, ...(data.settings || {}) },
    meta: { ...base.meta, ...(data.meta || {}) },
    batches: (data.batches || [])
      .filter((b) => b && b.id)
      .map((b) => ({
        note: '',
        closed: false,
        closedAt: null,
        ...b,
        qtyIn: num(b.qtyIn),
        totalCost: Math.round(num(b.totalCost)),
        sellPrice: Math.round(num(b.sellPrice)),
      })),
    moves: (data.moves || [])
      .filter((m) => m && m.id && m.batchId)
      .map((m) => ({
        ...m,
        kind: m.kind === 'loss' ? 'loss' : 'sale',
        qty: num(m.qty),
        amount: Math.round(num(m.amount)),
        unitPrice: Math.round(num(m.unitPrice)),
        day: m.day || dayKey(m.at || Date.now()),
      })),
    expenses: (data.expenses || [])
      .filter((e) => e && e.id)
      .map((e) => ({ batchId: null, note: '', ...e, amount: Math.round(num(e.amount)) })),
  }
}

// ───────────── Lots ─────────────

export function addBatch(input) {
  const b = {
    id: uid(),
    productName: input.productName.trim(),
    unit: input.unit,
    receivedAt: input.receivedAt,
    qtyIn: r3(input.qtyIn),
    totalCost: Math.round(input.totalCost),
    sellPrice: Math.round(input.sellPrice),
    note: (input.note || '').trim(),
    closed: false,
    closedAt: null,
    createdAt: Date.now(),
  }
  commit({ ...state, batches: [...state.batches, b] })
  return b
}

export function updateBatch(id, patch) {
  commit({
    ...state,
    batches: state.batches.map((b) =>
      b.id === id
        ? {
            ...b,
            ...patch,
            qtyIn: patch.qtyIn != null ? r3(patch.qtyIn) : b.qtyIn,
            totalCost: patch.totalCost != null ? Math.round(patch.totalCost) : b.totalCost,
            sellPrice: patch.sellPrice != null ? Math.round(patch.sellPrice) : b.sellPrice,
          }
        : b,
    ),
  })
}

/** Close a lot. If `writeOffQty` > 0 the leftover is recorded as a loss first. */
export function closeBatch(id, { writeOffQty = 0, reason = 'shrink' } = {}) {
  let moves = state.moves
  if (writeOffQty > 0) {
    const now = Date.now()
    moves = [
      ...moves,
      { id: uid(), batchId: id, kind: 'loss', day: dayKey(now), at: now, qty: r3(writeOffQty), unitPrice: 0, amount: 0, reason, note: 'ປິດລັອດ: ສ່ວນທີ່ເຫຼືອ' },
    ]
  }
  commit({
    ...state,
    moves,
    batches: state.batches.map((b) => (b.id === id ? { ...b, closed: true, closedAt: Date.now() } : b)),
  })
}

export function reopenBatch(id) {
  commit({ ...state, batches: state.batches.map((b) => (b.id === id ? { ...b, closed: false, closedAt: null } : b)) })
}

export function deleteBatch(id) {
  commit({
    ...state,
    batches: state.batches.filter((b) => b.id !== id),
    moves: state.moves.filter((m) => m.batchId !== id),
    expenses: state.expenses.map((e) => (e.batchId === id ? { ...e, batchId: null } : e)),
  })
}

// ───────────── Sales & losses ─────────────

export function addMove({ batchId, kind, qty, unitPrice = 0, amount = 0, reason, note, by }) {
  const now = Date.now()
  const m = {
    id: uid(),
    batchId,
    kind,
    day: dayKey(now),
    at: now,
    qty: r3(qty),
    unitPrice: kind === 'sale' ? Math.round(unitPrice) : 0,
    amount: kind === 'sale' ? Math.round(amount) : 0,
    ...(kind === 'loss' ? { reason: reason || 'other' } : {}),
    note: (note || '').trim(),
    ...(by ? { by } : {}),
  }
  commit({ ...state, moves: [...state.moves, m] })
  return m
}

export function deleteMove(id) {
  commit({ ...state, moves: state.moves.filter((m) => m.id !== id) })
}

export function restoreMove(m) {
  if (state.moves.some((x) => x.id === m.id)) return
  commit({ ...state, moves: [...state.moves, m] })
}

// ───────────── Expenses ─────────────

export function addExpense({ day, category, amount, note, batchId }) {
  const e = {
    id: uid(),
    day,
    category,
    amount: Math.round(amount),
    note: (note || '').trim(),
    batchId: batchId || null,
    createdAt: Date.now(),
  }
  commit({ ...state, expenses: [...state.expenses, e] })
  return e
}

export function deleteExpense(id) {
  commit({ ...state, expenses: state.expenses.filter((e) => e.id !== id) })
}

// ───────────── Settings, demo, backup ─────────────

export function updateSettings(patch) {
  commit({ ...state, settings: { ...state.settings, ...patch } })
}

export function hasDemo() {
  return !!state && (state.batches.some((b) => b.demo) || state.expenses.some((e) => e.demo))
}

export function clearDemo() {
  const demoBatchIds = new Set(state.batches.filter((b) => b.demo).map((b) => b.id))
  commit({
    ...state,
    settings: state.settings.shopName === 'ຮ້ານຕົວຢ່າງ' ? { ...state.settings, shopName: DEFAULT_SETTINGS.shopName } : state.settings,
    batches: state.batches.filter((b) => !b.demo),
    moves: state.moves.filter((m) => !m.demo && !demoBatchIds.has(m.batchId)),
    expenses: state.expenses.filter((e) => !e.demo).map((e) => (demoBatchIds.has(e.batchId) ? { ...e, batchId: null } : e)),
    meta: { ...state.meta, demoCleared: true },
  })
}

export function loadDemo() {
  const demo = makeDemoData()
  const keep = {
    batches: state.batches.filter((b) => !b.demo),
    moves: state.moves.filter((m) => !m.demo),
    expenses: state.expenses.filter((e) => !e.demo),
  }
  commit({
    ...state,
    batches: [...keep.batches, ...demo.batches],
    moves: [...keep.moves, ...demo.moves],
    expenses: [...keep.expenses, ...demo.expenses],
  })
}

export function replaceAll(data) {
  const next = normalize(data)
  next.meta.demoCleared = true
  commit(next)
}

export async function resetAll() {
  await wipeData()
  const next = emptyState()
  next.meta.demoCleared = true
  commit(next)
}

export function markBackup() {
  commit({ ...state, meta: { ...state.meta, lastBackupAt: Date.now() } })
}
