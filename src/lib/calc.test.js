import { describe, it, expect } from 'vitest'
import { lotStats, daySummary, planLot, saleAmount, roundMoney, avgCost } from './calc.js'
import { makeDemoData } from './demo.js'
import { parseBackup, makeBackupJSON, movesCSV } from './backup.js'

const sale = (batchId, qty, price, at, day = '2026-11-18') => ({ id: `s${at}`, batchId, kind: 'sale', qty, unitPrice: price, amount: Math.round(qty * price), at, day })
const loss = (batchId, qty, at, day = '2026-11-18') => ({ id: `l${at}`, batchId, kind: 'loss', qty, unitPrice: 0, amount: 0, reason: 'spoil', at, day })

describe('money helpers', () => {
  it('rounds to the shop step', () => {
    expect(roundMoney(106650, 500)).toBe(106500)
    expect(roundMoney(106750, 500)).toBe(107000)
    expect(roundMoney(106650, 0)).toBe(106650)
    expect(saleAmount(2.37, 45000, 1000)).toBe(107000)
  })
  it('average cost per unit', () => {
    expect(avgCost({ qtyIn: 20, totalCost: 300000 })).toBe(15000)
    expect(avgCost({ qtyIn: 0, totalCost: 300000 })).toBe(0)
  })
})

describe('planLot', () => {
  it('computes margin and break-even quantity', () => {
    const p = planLot({ qtyIn: 20, totalCost: 300000, sellPrice: 25000 })
    expect(p.avg).toBe(15000)
    expect(p.marginPerUnit).toBe(10000)
    expect(p.fullRevenue).toBe(500000)
    expect(p.fullProfit).toBe(200000)
    expect(p.breakEvenQty).toBe(12)
  })
})

describe('lotStats', () => {
  const lot = { id: 'A', qtyIn: 10, totalCost: 400000, sellPrice: 70000, unit: 'kg' }

  it('not yet recovered: shortfall and qty still to sell', () => {
    const moves = [sale('A', 0.5, 70000, 1), sale('A', 1, 70000, 2), sale('A', 0.7, 70000, 3), sale('A', 1, 70000, 4)]
    const s = lotStats(lot, moves, [])
    expect(s.soldQty).toBe(3.2)
    expect(s.revenue).toBe(224000)
    expect(s.remaining).toBe(6.8)
    expect(s.recovered).toBe(false)
    expect(s.shortfall).toBe(176000)
    expect(s.qtyToBreakEven).toBeCloseTo(2.514, 3)
    expect(s.breakEvenAt).toBeCloseTo(5.714, 3)
    expect(s.canBreakEven).toBe(true)
    expect(s.projectedRevenue).toBe(224000 + 6.8 * 70000)
    expect(s.projectedProfit).toBe(224000 + 476000 - 400000)
  })

  it('recovered: finds the point where the lot paid for itself', () => {
    const b = { id: 'B', qtyIn: 20, totalCost: 300000, sellPrice: 25000, unit: 'piece' }
    const moves = Array.from({ length: 13 }, (_, i) => sale('B', 1, 25000, i + 1))
    moves.push(loss('B', 1, 99))
    const s = lotStats(b, moves, [])
    expect(s.recovered).toBe(true)
    expect(s.balance).toBe(25000)
    expect(s.breakEvenAt).toBe(12)
    expect(s.remaining).toBe(6)
    expect(s.cogsSold).toBe(13 * 15000)
    expect(s.lossCost).toBe(15000)
    expect(s.netSoFar).toBe(325000 - 195000 - 15000)
  })

  it('linked expenses raise the break-even target', () => {
    const b = { id: 'C', qtyIn: 15, totalCost: 1650000, sellPrice: 150000, unit: 'kg' }
    const s = lotStats(b, [sale('C', 11, 150000, 1)], [{ id: 'e', batchId: 'C', amount: 50000 }])
    expect(s.costToRecover).toBe(1700000)
    expect(s.recovered).toBe(false)
    expect(s.shortfall).toBe(50000)
  })

  it('warns when even selling everything cannot recover the cost', () => {
    const b = { id: 'D', qtyIn: 10, totalCost: 500000, sellPrice: 40000, unit: 'kg' }
    const s = lotStats(b, [loss('D', 2, 1)], [])
    expect(s.canBreakEven).toBe(false)
    expect(s.projectedProfit).toBe(8 * 40000 - 500000)
  })

  it('handles over-selling and float noise', () => {
    const b = { id: 'E', qtyIn: 0.3, totalCost: 30000, sellPrice: 150000, unit: 'kg' }
    const s = lotStats(b, [sale('E', 0.1, 150000, 1), sale('E', 0.2, 150000, 2), sale('E', 0.1, 150000, 3)], [])
    expect(s.soldQty).toBe(0.4)
    expect(s.remaining).toBe(-0.1)
    expect(s.oversold).toBe(0.1)
    expect(s.sellable).toBe(0)
  })
})

describe('daySummary', () => {
  it('cash − cost of goods − losses − expenses = net', () => {
    const b = { id: 'A', qtyIn: 20, totalCost: 300000, sellPrice: 25000 }
    const state = {
      batches: [b],
      moves: [sale('A', 2, 25000, 1), sale('A', 1, 25000, 2), loss('A', 1, 3), sale('A', 5, 25000, 4, '2026-11-17')],
      expenses: [{ id: 'x', day: '2026-11-18', amount: 10000, batchId: null }],
    }
    const d = daySummary(state, '2026-11-18')
    expect(d.cash).toBe(75000)
    expect(d.cogs).toBe(45000)
    expect(d.lossCost).toBe(15000)
    expect(d.expenses).toBe(10000)
    expect(d.net).toBe(5000)
    expect(d.saleCount).toBe(2)
  })
})

describe('demo data', () => {
  it('produces the intended mix of recovered / not-recovered lots', () => {
    const demo = makeDemoData(new Date(2026, 10, 18, 14, 0))
    const stats = demo.batches.map((b) => lotStats(b, demo.moves, demo.expenses))
    const byName = (n, closed = false) => stats.find((s) => s.batch.productName === n && s.batch.closed === closed)
    expect(byName('ສະບູ່ສະໝຸນໄພ (ສະປ່າ)', true).remaining).toBe(0)
    expect(byName('ສະບູ່ສະໝຸນໄພ (ສະປ່າ)').recovered).toBe(true)
    expect(byName('ເກືອຂັດຜິວ (ສະປ່າ)').recovered).toBe(false)
    expect(byName('ຊີ້ນງົວສົດ').recovered).toBe(true)
    expect(byName('ຊີ້ນງົວສົດ').remaining).toBe(3)
    expect(byName('ໝາກມ່ວງ').recovered).toBe(false)
    expect(byName('ໝາກມ່ວງ').remaining).toBe(20)
  })
})

describe('backup round-trip', () => {
  it('exports and re-imports the same records', () => {
    const demo = makeDemoData()
    const state = { version: 1, settings: { shopName: 'x', rounding: 500 }, meta: {}, ...demo }
    const { data, summary } = parseBackup(makeBackupJSON(state))
    expect(summary.batches).toBe(demo.batches.length)
    expect(data.moves.length).toBe(demo.moves.length)
    expect(movesCSV(state).startsWith('﻿')).toBe(true)
  })
  it('rejects files that are not backups', () => {
    expect(() => parseBackup('hello')).toThrow()
    expect(() => parseBackup('{"a":1}')).toThrow()
  })
})
