// Backup / restore (JSON) and spreadsheet export (CSV for Excel / Google Sheets).
import { lotStats, avgCost } from './calc.js'
import { unitOf, lossLabel } from './units.js'
import { todayKey, timeText, r3 } from './format.js'
import { normalize } from './store.js'

export const APP_TAG = 'dalin-stock'

export function backupFileName() {
  return `dalin-stock-backup-${todayKey()}.json`
}

export function makeBackupJSON(state) {
  return JSON.stringify({ app: APP_TAG, exportedAt: new Date().toISOString(), ...state }, null, 1)
}

/** Parse and check a backup file. Throws an Error with a Lao message if invalid. */
export function parseBackup(text) {
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('ໄຟລ໌ນີ້ບໍ່ແມ່ນໄຟລ໌ສຳຮອງ (JSON) ທີ່ຖືກຕ້ອງ')
  }
  if (!data || typeof data !== 'object' || !Array.isArray(data.batches) || !Array.isArray(data.moves)) {
    throw new Error('ບໍ່ພົບຂໍ້ມູນລັອດ ຫຼື ລາຍການຂາຍໃນໄຟລ໌ນີ້ — ກະລຸນາເລືອກໄຟລ໌ dalin-stock-backup-….json')
  }
  const clean = normalize(data)
  return {
    data: clean,
    summary: {
      exportedAt: data.exportedAt || null,
      shopName: clean.settings.shopName,
      batches: clean.batches.length,
      moves: clean.moves.length,
      expenses: clean.expenses.length,
    },
  }
}

// ───────────── CSV ─────────────

function csvCell(v) {
  const s = v == null ? '' : String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function toCSV(rows) {
  // BOM so Excel shows Lao text correctly
  return '﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n')
}

export function movesCSV(state) {
  const byId = new Map(state.batches.map((b) => [b.id, b]))
  const rows = [['ວັນທີ', 'ເວລາ', 'ປະເພດ', 'ສິນຄ້າ', 'ລັອດ (ວັນຮັບ)', 'ຈຳນວນ', 'ໜ່ວຍ', 'ລາຄາ/ໜ່ວຍ', 'ຍອດເງິນ', 'ຕົ້ນທຶນ', 'ສາເຫດ', 'ໝາຍເຫດ', 'ຜູ້ບັນທຶກ']]
  const moves = [...state.moves].sort((a, b) => a.at - b.at)
  for (const m of moves) {
    const b = byId.get(m.batchId)
    if (!b) continue
    rows.push([
      m.day,
      timeText(m.at),
      m.kind === 'sale' ? 'ຂາຍ' : 'ຂອງເສຍ/ແຖມ/ຫາຍ',
      b.productName,
      b.receivedAt,
      r3(m.qty),
      unitOf(b.unit).short,
      m.kind === 'sale' ? m.unitPrice : '',
      m.kind === 'sale' ? m.amount : 0,
      Math.round(m.qty * avgCost(b)),
      m.kind === 'loss' ? lossLabel(m.reason) : '',
      m.note || '',
      m.by === 'staff' ? 'ພະນັກງານ' : m.by === 'owner' ? 'ເຈົ້າຂອງ' : '',
    ])
  }
  return toCSV(rows)
}

export function lotsCSV(state) {
  const rows = [['ວັນຮັບ', 'ສິນຄ້າ', 'ໜ່ວຍ', 'ຮັບມາ', 'ຕົ້ນທຶນລວມ', 'ຕົ້ນທຶນ/ໜ່ວຍ', 'ລາຄາຂາຍ/ໜ່ວຍ', 'ຂາຍແລ້ວ', 'ເສຍ/ແຖມ/ຫາຍ', 'ເຫຼືອ', 'ຍອດຂາຍ', 'ຄ່າໃຊ້ຈ່າຍລັອດ', 'ຄືນທຶນ (+ກຳໄລ / −ຂາດ)', 'ສະຖານະ']]
  const lots = [...state.batches].sort((a, b) => a.receivedAt.localeCompare(b.receivedAt))
  for (const b of lots) {
    const s = lotStats(b, state.moves, state.expenses)
    rows.push([
      b.receivedAt,
      b.productName,
      unitOf(b.unit).short,
      b.qtyIn,
      b.totalCost,
      Math.round(s.avg),
      b.sellPrice,
      s.soldQty,
      s.lossQty,
      s.remaining,
      s.revenue,
      s.lotExpenses,
      s.balance,
      b.closed ? 'ປິດແລ້ວ' : 'ກຳລັງຂາຍ',
    ])
  }
  return toCSV(rows)
}

export function expensesCSV(state) {
  const byId = new Map(state.batches.map((b) => [b.id, b]))
  const rows = [['ວັນທີ', 'ປະເພດ', 'ຈຳນວນເງິນ', 'ລັອດ', 'ໝາຍເຫດ']]
  for (const e of [...state.expenses].sort((a, b) => a.day.localeCompare(b.day))) {
    const b = e.batchId ? byId.get(e.batchId) : null
    rows.push([e.day, e.category, e.amount, b ? `${b.productName} (${b.receivedAt})` : '', e.note || ''])
  }
  return toCSV(rows)
}

// ───────────── Deliver a file ─────────────

export function canShareFiles() {
  try {
    const f = new File(['x'], 'x.json', { type: 'application/json' })
    return !!navigator.canShare?.({ files: [f] })
  } catch {
    return false
  }
}

export function downloadText(name, text, mime) {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
  return 'downloaded'
}

/** Open the share sheet (LINE, WhatsApp, Files, Google Drive…). */
export async function shareText(name, text, mime) {
  const file = new File([text], name, { type: mime })
  try {
    await navigator.share({ files: [file], title: name })
    return 'shared'
  } catch (e) {
    if (e?.name === 'AbortError') return 'cancelled'
    return downloadText(name, text, mime)
  }
}
