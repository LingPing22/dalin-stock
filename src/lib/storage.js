// Saves everything on this device only. IndexedDB first (room for years of
// records), localStorage as a fallback when IndexedDB is unavailable.
import { get, set, del, createStore } from 'idb-keyval'

const KEY = 'dalin-stock:v1'
let idbStore = null
let mode = 'idb'

function idb() {
  if (!idbStore) idbStore = createStore('dalin-stock', 'kv')
  return idbStore
}

export async function loadData() {
  try {
    const data = await get(KEY, idb())
    if (data !== undefined) return data
    // migrate from a localStorage copy if one exists
    const ls = readLocal()
    if (ls) {
      await set(KEY, ls, idb())
      return ls
    }
    return null
  } catch {
    mode = 'local'
    return readLocal()
  }
}

export async function saveData(data) {
  if (mode === 'idb') {
    try {
      await set(KEY, data, idb())
      return true
    } catch {
      mode = 'local'
    }
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

export async function wipeData() {
  try {
    await del(KEY, idb())
  } catch {
    /* ignore */
  }
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

function readLocal() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function storageMode() {
  return mode === 'idb' ? 'IndexedDB' : 'LocalStorage'
}

/** Ask the browser not to clear our data when space is low. */
export async function requestPersist() {
  try {
    if (navigator.storage?.persist) {
      if (await navigator.storage.persisted()) return true
      return await navigator.storage.persist()
    }
  } catch {
    /* ignore */
  }
  return false
}

export async function storageInfo() {
  try {
    const est = (await navigator.storage?.estimate?.()) || {}
    const persisted = (await navigator.storage?.persisted?.()) || false
    return { usage: est.usage || 0, quota: est.quota || 0, persisted }
  } catch {
    return { usage: 0, quota: 0, persisted: false }
  }
}
