export type UserRole = 'cashier' | 'owner'

export type ShiftStatus = 'OPEN' | 'CLOSED'

export type OrderStatus = 'PENDING' | 'QRIS_PENDING' | 'PAID' | 'VOIDED' | 'EXPIRED'

export type PaymentMethod = 'TUNAI' | 'QRIS'

export interface AppUser {
  id: string
  displayName: string
  email?: string | null
  role: UserRole | null
}

export interface NavItem {
  href: string
  label: string
  active?: boolean
}

export interface TokenSwatch {
  className: string
  label: string
  value: string
}