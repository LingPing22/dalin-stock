import { describe, it, expect, vi, afterEach } from 'vitest'
import { sha256, toHex, hashPin } from './pinhash.js'
import {
  setOwnerPin,
  setStaffPin,
  lockNow,
  tryUnlock,
  getSecurity,
  isLocked,
  checkNewPin,
  disablePin,
  verifyOwnerPin,
  MAX_FAILS,
  LOCKOUT_MS,
} from './security.js'

const enc = (s) => new TextEncoder().encode(s)

describe('sha256', () => {
  it('matches the standard test vectors', () => {
    expect(toHex(sha256(enc('')))).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
    expect(toHex(sha256(enc('abc')))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
    expect(toHex(sha256(enc('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')))).toBe(
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    )
    expect(toHex(sha256(enc('a'.repeat(1000))))).toBe('41edece42d63e8d9bf515a9ba6932e1c20cbc9f5a5d134645adb5db1b9737ea3')
  })
  it('salted PIN hashes differ per salt and never contain the PIN', () => {
    const a = hashPin('4826', 'salt-a', 50)
    expect(a).not.toBe(hashPin('4826', 'salt-b', 50))
    expect(a).toBe(hashPin('4826', 'salt-a', 50))
    expect(a.includes('4826')).toBe(false)
  })
})

describe('PIN rules', () => {
  it('rejects weak or mismatched PINs', () => {
    expect(checkNewPin('12', '12')).toMatch(/4–6/)
    expect(checkNewPin('4826', '4827')).toMatch(/ບໍ່ກົງກັນ/)
    expect(checkNewPin('1111', '1111')).toMatch(/ເດົາງ່າຍ/)
    expect(checkNewPin('1234', '1234')).toMatch(/ເດົາງ່າຍ/)
    expect(checkNewPin('4826', '4826')).toBeNull()
  })
})

describe('lock, roles and lockout', () => {
  afterEach(() => vi.useRealTimers())

  it('unlocks owner and staff with their own PINs', async () => {
    await setOwnerPin('4826')
    await setStaffPin('7391')
    expect(checkNewPin('4826', '4826', { notSameAs: getSecurity().config.owner })).toMatch(/ບໍ່ຊ້ຳ/)
    lockNow()
    expect(isLocked()).toBe(true)
    expect(tryUnlock('7391')).toEqual({ ok: true, role: 'staff' })
    lockNow()
    expect(tryUnlock('4826')).toEqual({ ok: true, role: 'owner' })
    expect(verifyOwnerPin('4826')).toBe(true)
    expect(verifyOwnerPin('7391')).toBe(false)
  })

  it(`locks for a minute after ${MAX_FAILS} wrong PINs`, () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 10, 18, 10, 0, 0))
    lockNow()
    for (let i = 1; i < MAX_FAILS; i++) expect(tryUnlock('0000')).toEqual({ ok: false, left: MAX_FAILS - i })
    expect(tryUnlock('0000').lockedMs).toBe(LOCKOUT_MS)
    // even the right PIN is refused during the lockout
    expect(tryUnlock('4826').ok).toBe(false)
    vi.setSystemTime(new Date(2026, 10, 18, 10, 1, 1))
    expect(tryUnlock('4826')).toEqual({ ok: true, role: 'owner' })
  })

  it('turning the lock off opens the app as owner', async () => {
    await disablePin()
    expect(isLocked()).toBe(false)
    expect(getSecurity().role).toBe('owner')
  })
})
