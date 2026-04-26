import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const { userId } = req.body
  if (!userId) return res.status(400).json({ error: 'userId required' })
  try {
    const { count } = await supabase.from('properties').select('id', { count: 'exact', head: true }).eq('user_id', userId)
    if ((count || 0) > 0) return res.json({ ok: true, skipped: true })
    const { data: property } = await supabase.from('properties').insert({ name: '14 Victoria Road (Demo)', address: '14 Victoria Road, Manchester, M14 5BJ', user_id: userId }).select().single()
    if (!property) throw new Error('Property creation failed')
    const { data: roomRows } = await supabase.from('rooms').insert([
      { name: 'Room 1 - Single', monthly_rent: 550, property_id: property.id, user_id: userId },
      { name: 'Room 2 - Double', monthly_rent: 675, property_id: property.id, user_id: userId },
      { name: 'Room 3 - En-suite', monthly_rent: 750, property_id: property.id, user_id: userId },
    ]).select()
    if (!roomRows || roomRows.length < 3) throw new Error('Room creation failed')
    const [room1, room2] = roomRows
    const thisMonth = new Date().toISOString().slice(0, 7)
    const prevMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 7)
    const demoEmail = 'demo+' + userId.slice(0, 8) + '@letflowuk.com'
    const { data: tenantRows } = await supabase.from('tenants').insert([
      { first_name: 'Sarah', last_name: 'Johnson', email: demoEmail, room_id: room1.id, property_id: property.id, user_id: userId, tenancy_start: thisMonth + '-01' },
      { first_name: 'James', last_name: 'Patel', email: demoEmail, room_id: room2.id, property_id: property.id, user_id: userId, tenancy_start: thisMonth + '-01' },
    ]).select()
    if (!tenantRows) throw new Error('Tenant creation failed')
    const [tenant1, tenant2] = tenantRows
    await supabase.from('payments').insert([
      { tenant_id: tenant1.id, room_id: room1.id, property_id: property.id, user_id: userId, amount: 550, due_date: thisMonth + '-01', status: 'paid', paid_date: thisMonth + '-01' },
      { tenant_id: tenant2.id, room_id: room2.id, property_id: property.id, user_id: userId, amount: 675, due_date: thisMonth + '-01', status: 'overdue' },
      { tenant_id: tenant1.id, room_id: room1.id, property_id: property.id, user_id: userId, amount: 550, due_date: prevMonth + '-01', status: 'paid', paid_date: prevMonth + '-02' },
      { tenant_id: tenant2.id, room_id: room2.id, property_id: property.id, user_id: userId, amount: 675, due_date: prevMonth + '-01', status: 'paid', paid_date: prevMonth + '-03' },
    ])
    await supabase.from('expenses').insert([
      { user_id: userId, property_id: property.id, description: 'Boiler service', category: 'maintenance', amount: 120, date: thisMonth + '-05' },
      { user_id: userId, property_id: property.id, description: 'Buildings insurance', category: 'insurance', amount: 65, date: thisMonth + '-01' },
    ])
    res.json({ ok: true, propertyId: property.id })
  } catch (err: any) {
    console.error('Demo load error:', err)
    res.status(500).json({ error: err.message })
  }
      }
