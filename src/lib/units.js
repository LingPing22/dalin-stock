// Selling units. `decimals: true` = sold by weight (2.5 kg), otherwise whole pieces.
export const UNITS = [
  { key: 'kg', label: 'ກິໂລ', short: 'ກກ.', decimals: true, chips: [0.5, 1, 2, 3] },
  { key: 'piece', label: 'ກ້ອນ', short: 'ກ້ອນ', decimals: false, chips: [1, 2, 3, 5] },
  { key: 'bag', label: 'ຖົງ', short: 'ຖົງ', decimals: false, chips: [1, 2, 3, 5] },
  { key: 'pack', label: 'ແພັກ', short: 'ແພັກ', decimals: false, chips: [1, 2, 3, 5] },
  { key: 'bundle', label: 'ມັດ', short: 'ມັດ', decimals: false, chips: [1, 2, 3, 5] },
  { key: 'item', label: 'ອັນ', short: 'ອັນ', decimals: false, chips: [1, 2, 3, 5] },
]

export function unitOf(key) {
  return UNITS.find((u) => u.key === key) || UNITS[0]
}

export const LOSS_REASONS = [
  { key: 'spoil', label: 'ຂອງເສຍ / ເນົ່າ' },
  { key: 'free', label: 'ຊັ່ງແຖມ / ແຖມລູກຄ້າ' },
  { key: 'shrink', label: 'ນ້ຳໜັກຫາຍ' },
  { key: 'other', label: 'ອື່ນໆ' },
]

export function lossLabel(key) {
  return (LOSS_REASONS.find((r) => r.key === key) || LOSS_REASONS[3]).label
}

export const EXPENSE_CATEGORIES = [
  'ຄ່າຖົງ / ບັນຈຸພັນ',
  'ຄ່າເດີນທາງ / ນ້ຳມັນ',
  'ນ້ຳກ້ອນ',
  'ຄ່າບ່ອນຂາຍ',
  'ຄ່າຂົນສົ່ງ',
  'ອື່ນໆ',
]
