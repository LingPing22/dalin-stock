// Sample data shown on first launch, dated relative to "today" so the
// dashboard always looks alive. Every record carries `demo: true` so
// "clear sample data" removes only these and keeps anything the user added.
import { addDays, todayKey, keyToDate, uid } from './format.js'
import { saleAmount } from './calc.js'

const ROUND = 500

function at(dayKeyStr, minutes) {
  const d = keyToDate(dayKeyStr)
  d.setMinutes(minutes)
  return d.getTime()
}

export function makeDemoData(now = new Date()) {
  const today = todayKey()
  const day = (ago) => addDays(today, -ago)
  const batches = []
  const moves = []
  const expenses = []

  // Today's entries must not be in the future.
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const todaySlots = (n) => {
    const end = Math.max(nowMin - 4, 20)
    const start = Math.min(6 * 60 + 15, end - n * 3)
    const step = Math.max(2, Math.floor((end - start) / (n + 1)))
    return Array.from({ length: n }, (_, i) => start + step * (i + 1))
  }

  function lot(o) {
    const b = {
      id: uid(),
      productName: o.name,
      unit: o.unit,
      receivedAt: day(o.ago),
      qtyIn: o.qtyIn,
      totalCost: o.totalCost,
      sellPrice: o.price,
      note: o.note || '',
      closed: !!o.closedAgo || o.closedAgo === 0,
      closedAt: o.closedAgo != null ? at(day(o.closedAgo), 18 * 60) : null,
      createdAt: at(day(o.ago), 5 * 60 + 30),
      demo: true,
    }
    batches.push(b)
    // o.sales: { [daysAgo]: [qty, qty, ...] }
    for (const [ago, list] of Object.entries(o.sales || {})) {
      const k = day(Number(ago))
      const mins = Number(ago) === 0 ? todaySlots(list.length) : list.map((_, i) => 6 * 60 + 40 + i * 95 + (b.productName.length % 7) * 4)
      list.forEach((qty, i) => {
        moves.push({
          id: uid(),
          batchId: b.id,
          kind: 'sale',
          day: k,
          at: at(k, mins[i]),
          qty,
          unitPrice: b.sellPrice,
          amount: saleAmount(qty, b.sellPrice, ROUND),
          demo: true,
        })
      })
    }
    for (const l of o.losses || []) {
      const k = day(l.ago)
      moves.push({
        id: uid(),
        batchId: b.id,
        kind: 'loss',
        day: k,
        at: l.ago === 0 ? at(k, todaySlots(1)[0] + 1) : at(k, 17 * 60 + 10),
        qty: l.qty,
        unitPrice: 0,
        amount: 0,
        reason: l.reason,
        note: l.note || '',
        demo: true,
      })
    }
    return b
  }

  lot({
    name: 'ສະບູ່ສະໝຸນໄພ (ສະປ່າ)', unit: 'piece', ago: 9, qtyIn: 20, totalCost: 300000, price: 25000, closedAgo: 5,
    sales: { 9: [2, 1, 3], 8: [2, 2], 7: [1, 3, 1], 6: [2, 1], 5: [1] },
    losses: [{ ago: 7, qty: 1, reason: 'free', note: 'ແຖມລູກຄ້າປະຈຳ' }],
  })
  lot({
    name: 'ສະບູ່ສະໝຸນໄພ (ສະປ່າ)', unit: 'piece', ago: 4, qtyIn: 20, totalCost: 320000, price: 25000,
    sales: { 4: [2, 1, 1], 3: [1, 2], 2: [1, 1], 1: [2], 0: [1, 1] },
    losses: [{ ago: 2, qty: 1, reason: 'free' }],
  })
  lot({
    name: 'ເກືອຂັດຜິວ (ສະປ່າ)', unit: 'kg', ago: 3, qtyIn: 10, totalCost: 400000, price: 70000,
    sales: { 3: [0.5, 1], 2: [0.7], 0: [1] },
  })
  const beef = lot({
    name: 'ຊີ້ນງົວສົດ', unit: 'kg', ago: 1, qtyIn: 15, totalCost: 1650000, price: 150000,
    sales: { 1: [1.5, 2, 0.8, 1.1, 1], 0: [2, 1.3, 0.5, 1.5] },
    losses: [{ ago: 0, qty: 0.3, reason: 'shrink', note: 'ນ້ຳໜັກຫາຍຕອນຕັດແຕ່ງ' }],
  })
  lot({
    name: 'ໝາກມ່ວງ', unit: 'kg', ago: 0, qtyIn: 30, totalCost: 450000, price: 25000,
    sales: { 0: [2, 1.5, 3, 2] },
    losses: [{ ago: 0, qty: 1.5, reason: 'spoil', note: 'ຊ້ຳ/ເນົ່າ ຄັດອອກ' }],
  })

  const exp = (ago, category, amount, note = '', batchId = null) =>
    expenses.push({ id: uid(), day: day(ago), category, amount, note, batchId, createdAt: at(day(ago), 7 * 60), demo: true })
  exp(0, 'ຄ່າຖົງ / ບັນຈຸພັນ', 15000, 'ຖົງຢາງ 1 ມັດ')
  exp(0, 'ຄ່າເດີນທາງ / ນ້ຳມັນ', 30000, 'ໄປຕະຫຼາດເຊົ້າ')
  exp(1, 'ຄ່າຂົນສົ່ງ', 50000, 'ຄ່າລົດຂົນຊີ້ນ', beef.id)
  exp(1, 'ນ້ຳກ້ອນ', 10000)
  exp(3, 'ຄ່າບ່ອນຂາຍ', 20000)
  exp(5, 'ຄ່າຖົງ / ບັນຈຸພັນ', 10000)

  return { batches, moves, expenses }
}
