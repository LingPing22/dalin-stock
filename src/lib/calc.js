// All business math lives here so it can be unit-tested (see calc.test.js).
// Money is whole kip. Quantities are kg (decimals) or pieces.
import { r3, addDays } from './format.js'

const EPS = 1e-9
const sum = (arr, f) => arr.reduce((s, x) => s + (Number(typeof f === 'function' ? f(x) : x[f]) || 0), 0)

/** Average cost per unit of a lot (ຕົ້ນທຶນສະເລ່ຍຕໍ່ໜ່ວຍ). */
export function avgCost(batch) {
  return batch.qtyIn > 0 ? batch.totalCost / batch.qtyIn : 0
}

/** Round a money amount to the shop's rounding step (0 = nearest kip). */
export function roundMoney(amount, step = 0) {
  if (!step) return Math.round(amount)
  return Math.round(amount / step) * step
}

/** Amount to collect for a sale. */
export function saleAmount(qty, unitPrice, step = 0) {
  return roundMoney(qty * unitPrice, step)
}

/** Plan figures for a lot before any sales (used in the stock-in form). */
export function planLot({ qtyIn, totalCost, sellPrice }) {
  const avg = qtyIn > 0 ? totalCost / qtyIn : 0
  const marginPerUnit = sellPrice - avg
  const fullRevenue = qtyIn * sellPrice
  return {
    avg,
    marginPerUnit,
    marginPct: sellPrice > 0 ? marginPerUnit / sellPrice : 0,
    markupPct: avg > 0 ? marginPerUnit / avg : 0,
    fullRevenue,
    fullProfit: fullRevenue - totalCost,
    breakEvenQty: sellPrice > 0 ? totalCost / sellPrice : Infinity,
  }
}

/**
 * Everything the screens need to know about one lot.
 * Break-even is cash-based: money taken in from sales vs. what was paid
 * for the lot (+ expenses linked to the lot).
 */
export function lotStats(batch, allMoves, allExpenses = []) {
  const moves = allMoves.filter((m) => m.batchId === batch.id)
  const sales = moves.filter((m) => m.kind === 'sale').sort((a, b) => a.at - b.at)
  const losses = moves.filter((m) => m.kind === 'loss')

  const soldQty = r3(sum(sales, 'qty'))
  const lossQty = r3(sum(losses, 'qty'))
  const remaining = r3(batch.qtyIn - soldQty - lossQty)
  const sellable = Math.max(0, remaining)
  const revenue = sum(sales, 'amount')
  const avg = avgCost(batch)
  const lotExpenses = sum(allExpenses.filter((e) => e.batchId === batch.id), 'amount')
  const costToRecover = batch.totalCost + lotExpenses
  const balance = revenue - costToRecover // < 0 → still short; ≥ 0 → profit so far
  const recovered = balance >= 0
  const shortfall = Math.max(0, -balance)
  const price = batch.sellPrice

  const qtyToBreakEven = recovered ? 0 : price > 0 ? r3(shortfall / price) : Infinity
  const canBreakEven = recovered || qtyToBreakEven <= sellable + EPS

  // Where on the "sold" axis the lot paid for itself.
  let breakEvenAt
  if (recovered) {
    breakEvenAt = 0
    let cumRev = 0
    let cumQty = 0
    for (const s of sales) {
      if (cumRev + s.amount >= costToRecover - EPS) {
        const p = s.qty > 0 ? s.amount / s.qty : price
        breakEvenAt = costToRecover <= 0 ? 0 : cumQty + (p > 0 ? (costToRecover - cumRev) / p : 0)
        break
      }
      cumRev += s.amount
      cumQty += s.qty
    }
    breakEvenAt = r3(breakEvenAt)
  } else {
    breakEvenAt = r3(soldQty + qtyToBreakEven)
  }

  const cogsSold = soldQty * avg
  const lossCost = lossQty * avg
  const projectedRevenue = revenue + sellable * price

  return {
    batch,
    sales,
    losses,
    moves: [...moves].sort((a, b) => b.at - a.at),
    soldQty,
    lossQty,
    remaining,
    sellable,
    oversold: remaining < -EPS ? r3(-remaining) : 0,
    revenue,
    avg,
    lotExpenses,
    costToRecover,
    balance,
    recovered,
    shortfall,
    qtyToBreakEven,
    canBreakEven,
    breakEvenAt,
    recoveredPct: costToRecover > 0 ? Math.min(1, revenue / costToRecover) : 1,
    cogsSold,
    lossCost,
    netSoFar: revenue - cogsSold - lossCost - lotExpenses,
    remainingValue: sellable * price,
    stockValueAtCost: sellable * avg,
    projectedRevenue,
    projectedProfit: projectedRevenue - costToRecover,
    plannedBreakEvenQty: price > 0 ? r3(costToRecover / price) : Infinity,
    lastSaleAt: sales.length ? sales[sales.length - 1].at : null,
    soldOut: sellable <= EPS,
  }
}

/** Daily summary (ສະຫຼຸບລາຍວັນ). */
export function daySummary(state, key) {
  const byId = new Map(state.batches.map((b) => [b.id, b]))
  const moves = state.moves.filter((m) => m.day === key)
  const sales = moves.filter((m) => m.kind === 'sale')
  const losses = moves.filter((m) => m.kind === 'loss')
  const costOf = (m) => {
    const b = byId.get(m.batchId)
    return b ? m.qty * avgCost(b) : 0
  }
  const cash = sum(sales, 'amount')
  const cogs = sum(sales, costOf)
  const lossCost = sum(losses, costOf)
  const dayExpenses = state.expenses.filter((e) => e.day === key)
  const expenses = sum(dayExpenses, 'amount')

  const lots = new Map()
  for (const m of moves) {
    const b = byId.get(m.batchId)
    if (!b) continue
    const row = lots.get(b.id) || { batch: b, soldQty: 0, lossQty: 0, cash: 0, cogs: 0 }
    if (m.kind === 'sale') {
      row.soldQty = r3(row.soldQty + m.qty)
      row.cash += m.amount
      row.cogs += costOf(m)
    } else {
      row.lossQty = r3(row.lossQty + m.qty)
    }
    lots.set(b.id, row)
  }

  return {
    key,
    cash,
    cogs,
    lossCost,
    expenses,
    expenseItems: dayExpenses,
    net: cash - cogs - lossCost - expenses,
    saleCount: sales.length,
    lossCount: losses.length,
    byLot: [...lots.values()].sort((a, b) => b.cash - a.cash),
  }
}

/** Last N days, newest first. */
export function recentDays(state, endKey, n = 7) {
  const out = []
  for (let i = 0; i < n; i++) out.push(daySummary(state, addDays(endKey, -i)))
  return out
}

/** Totals across all open lots: what's left and what it's worth. */
export function openLotsOutlook(statsList) {
  const open = statsList.filter((s) => !s.batch.closed)
  return {
    count: open.length,
    remainingValue: sum(open, 'remainingValue'),
    stockValueAtCost: sum(open, 'stockValueAtCost'),
    projectedProfit: sum(open, 'projectedProfit'),
    balance: sum(open, 'balance'),
    notRecovered: open.filter((s) => !s.recovered).length,
  }
}
