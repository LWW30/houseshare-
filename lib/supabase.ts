import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Property = {
  id: string
  landlord_id: string
  name: string
  address: string
  created_at: string
}

export type Room = {
  id: string
  property_id: string
  name: string
  monthly_rent: number
  created_at: string
}

export type Tenant = {
  id: string
  room_id: string
  property_id: string
  name: string
  email: string
  phone?: string
  tenancy_start: string
  tenancy_end?: string
  invite_token: string
  created_at: string
  room?: Room
  property?: Property
}

export type RentPayment = {
  id: string
  tenant_id: string
  property_id: string
  amount: number
  due_date: string
  paid_date?: string
  status: 'pending' | 'paid' | 'late' | 'overdue'
  notes?: string
  created_at: string
  tenant?: Tenant
}

export type SharedBill = {
  id: string
  property_id: string
  name: string
  amount: number
  due_date: string
  paid: boolean
  split_ways: number
  category: 'broadband' | 'council_tax' | 'electricity' | 'gas' | 'water' | 'other'
  created_at: string
  property?: Property
}

export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function signOut() {
  await supabase.auth.signOut()
}

export async function getProperties(landlordId: string) {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('landlord_id', landlordId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data as Property[]
}

export async function createProperty(landlordId: string, name: string, address: string) {
  const { data, error } = await supabase
    .from('properties')
    .insert({ landlord_id: landlordId, name, address })
    .select()
    .single()
  if (error) throw error
  return data as Property
}

export async function getRooms(propertyId: string) {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('property_id', propertyId)
    .order('name')
  if (error) throw error
  return data as Room[]
}

export async function createRoom(propertyId: string, name: string, monthlyRent: number) {
  const { data, error } = await supabase
    .from('rooms')
    .insert({ property_id: propertyId, name, monthly_rent: monthlyRent })
    .select()
    .single()
  if (error) throw error
  return data as Room
}

export async function getTenantsByProperty(propertyId: string) {
  const { data, error } = await supabase
    .from('tenants')
    .select('*, room:rooms(*)')
    .eq('property_id', propertyId)
    .order('name')
  if (error) throw error
  return data as Tenant[]
}

export async function createTenant(tenant: {
  room_id: string
  property_id: string
  name: string
  email: string
  phone?: string
  tenancy_start: string
  tenancy_end?: string
}) {
  const { data, error } = await supabase
    .from('tenants')
    .insert(tenant)
    .select()
    .single()
  if (error) throw error
  return data as Tenant
}

export async function getRentPayments(propertyIds: string[], month?: string) {
  let query = supabase
    .from('rent_payments')
    .select('*, tenant:tenants(*, room:rooms(*), property:properties(*))')
    .in('property_id', propertyIds)
    .order('due_date', { ascending: false })
  if (month) {
    const [y, m] = month.split('-').map(Number); const lastDay = new Date(y, m, 0).getDate(); query = query.gte('due_date', `${month}-01`).lte('due_date', `${month}-${lastDay}`)
  }
  const { data, error } = await query
  if (error) throw error
  return data as RentPayment[]
}

export async function markRentPaid(paymentId: string) {
  const today = new Date().toISOString().split('T')[0]
  const { error } = await supabase
    .from('rent_payments')
    .update({ status: 'paid', paid_date: today })
    .eq('id', paymentId)
  if (error) throw error
}

export async function getSharedBills(propertyIds: string[]) {
  const { data, error } = await supabase
    .from('shared_bills')
    .select('*, property:properties(*)')
    .in('property_id', propertyIds)
    .order('due_date', { ascending: true })
  if (error) throw error
  return data as SharedBill[]
}

export async function createSharedBill(bill: {
  property_id: string
  name: string
  amount: number
  due_date: string
  category: string
  split_ways: number
}) {
  const { data, error } = await supabase
    .from('shared_bills')
    .insert(bill)
    .select()
    .single()
  if (error) throw error
  return data as SharedBill
}

export async function toggleBillPaid(billId: string, paid: boolean) {
  const { error } = await supabase
    .from('shared_bills')
    .update({ paid })
    .eq('id', billId)
  if (error) throw error
}

export async function getTenantByToken(token: string) {
  const { data, error } = await supabase
    .from('tenants')
    .select('*, room:rooms(*), property:properties(*)')
    .eq('invite_token', token)
    .single()
  if (error) return null
  return data as Tenant
}

export async function getTenantPayments(tenantId: string) {
  const { data, error } = await supabase
    .from('rent_payments')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('due_date', { ascending: false })
    .limit(6)
  if (error) throw error
  return data as RentPayment[]
}

export async function generatePaymentsForTenant(tenantId: string) {
  const { error } = await supabase.rpc('backfill_payments_for_tenant', { tenant_id: tenantId })
  if (error) throw error
}

export async function updateOverduePayments() {
  const { error } = await supabase.rpc('update_overdue_payments')
  if (error) throw error
}

export async function getTenantBills(propertyId: string) {
  const { data, error } = await supabase
    .from('shared_bills')
    .select('*')
    .eq('property_id', propertyId)
    .order('due_date', { ascending: false })
    .limit(6)
  if (error) throw error
  return data as SharedBill[]
}

export type ExpenseCategory =
  | 'repairs_maintenance'
  | 'insurance'
  | 'mortgage_interest'
  | 'letting_fees'
  | 'professional_fees'
  | 'utilities'
  | 'furnishings'
  | 'travel'
  | 'other'

export const EXPENSE_CATEGORIES: Record<ExpenseCategory, { label: string; emoji: string; hmrc: string }> = {
  repairs_maintenance: { label: 'Repairs & Maintenance', emoji: '🔧', hmrc: 'Allowable' },
  insurance:           { label: 'Insurance',             emoji: '🛡️', hmrc: 'Allowable' },
  mortgage_interest:   { label: 'Mortgage Interest',     emoji: '🏦', hmrc: 'Allowable' },
  letting_fees:        { label: 'Letting Agent Fees',    emoji: '🏢', hmrc: 'Allowable' },
  professional_fees:   { label: 'Professional Fees',     emoji: '👔', hmrc: 'Allowable' },
  utilities:           { label: 'Utilities',             emoji: '💡', hmrc: 'Allowable' },
  furnishings:         { label: 'Furnishings',           emoji: '🛋️', hmrc: 'Allowable' },
  travel:              { label: 'Travel',                emoji: '🚗', hmrc: 'Allowable' },
  other:               { label: 'Other',                 emoji: '📋', hmrc: 'Check with accountant' },
}

export type Expense = {
  id: string
  landlord_id: string
  property_id?: string
  category: ExpenseCategory
  description: string
  amount: number
  date: string
  notes?: string
  created_at: string
  property?: Property
}

export async function getExpenses(landlordId: string, propertyId?: string) {
  let query = supabase
    .from('expenses')
    .select('*, property:properties(id, address)')
    .eq('landlord_id', landlordId)
    .order('date', { ascending: false })
  if (propertyId) query = query.eq('property_id', propertyId)
  const { data, error } = await query
  if (error) throw error
  return data as Expense[]
}

export async function createExpense(expense: {
  landlord_id: string
  property_id?: string
  category: ExpenseCategory
  description: string
  amount: number
  date: string
  notes?: string
}) {
  const { data, error } = await supabase
    .from('expenses')
    .insert(expense)
    .select('*, property:properties(id, address)')
    .single()
  if (error) throw error
  return data as Expense
}

export async function deleteExpense(id: string) {
  const { error } = await supabase.from('expenses').delete().eq('id', id)
  if (error) throw error
}
