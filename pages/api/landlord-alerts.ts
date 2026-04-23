import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const resend = new Resend(process.env.RESEND_API_KEY)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const authHeader = req.headers.authorization
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const today = new Date()
    const month = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0')

    // Get all overdue payments this month with landlord info
    const { data: payments, error } = await supabase
      .from('rent_payments')
      .select(`
        id, amount, status, due_date,
        tenant:tenants(id, name, email, landlord_id),
        room:rooms(name, property:properties(address))
      `)
      .in('status', ['overdue', 'late'])
      .gte('due_date', month + '-01')

    if (error) throw error
    if (!payments || payments.length === 0) {
      return res.status(200).json({ message: 'No overdue payments to notify' })
    }

    // Group overdue payments by landlord_id
    const byLandlord: Record<string, typeof payments> = {}
    for (const p of payments) {
      const landlordId = (p.tenant as any)?.landlord_id
      if (!landlordId) continue
      if (!byLandlord[landlordId]) byLandlord[landlordId] = []
      byLandlord[landlordId].push(p)
    }

    let emailsSent = 0
    const errors: string[] = []

    for (const [landlordId, overduePayments] of Object.entries(byLandlord)) {
      try {
        // Get landlord email via admin API
        const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(landlordId)
        if (userErr || !userData?.user?.email) continue
        const landlordEmail = userData.user.email

        const paymentRows = overduePayments.map(p => {
          const tenant = p.tenant as any
          const room = p.room as any
          const property = room?.property?.address || 'Unknown property'
          const daysOverdue = Math.floor((today.getTime() - new Date(p.due_date).getTime()) / 86400000)
          return `
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 12px 16px; font-size: 14px; color: #111827;">${tenant?.name || 'Unknown'}</td>
              <td style="padding: 12px 16px; font-size: 14px; color: #6b7280;">${property} · ${room?.name || ''}</td>
              <td style="padding: 12px 16px; font-size: 14px; font-weight: 600; color: #111827;">£${p.amount}</td>
              <td style="padding: 12px 16px; font-size: 14px; color: #dc2626;">${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue</td>
            </tr>
          `
        }).join('')

        const totalOverdue = overduePayments.reduce((s, p) => s + p.amount, 0)

        const html = `
          <!DOCTYPE html>
          <html>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f9fafb; margin: 0; padding: 0;">
            <div style="max-width: 560px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
              <div style="background: #111827; padding: 24px 32px;">
                <h1 style="color: white; font-size: 18px; margin: 0; font-weight: 600;">LetFlowUK</h1>
                <p style="color: #9ca3af; font-size: 13px; margin: 4px 0 0;">Rent alert</p>
              </div>
              <div style="padding: 32px;">
                <h2 style="font-size: 20px; color: #111827; margin: 0 0 8px;">${overduePayments.length} overdue payment${overduePayments.length !== 1 ? 's' : ''}</h2>
                <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px;">The following tenants have outstanding rent for ${today.toLocaleString('en-GB', { month: 'long', year: 'numeric' })}.</p>
                <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                  <thead>
                    <tr style="background: #f9fafb;">
                      <th style="padding: 10px 16px; text-align: left; font-size: 12px; color: #6b7280; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;">Tenant</th>
                      <th style="padding: 10px 16px; text-align: left; font-size: 12px; color: #6b7280; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;">Property</th>
                      <th style="padding: 10px 16px; text-align: left; font-size: 12px; color: #6b7280; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;">Amount</th>
                      <th style="padding: 10px 16px; text-align: left; font-size: 12px; color: #6b7280; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em;">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${paymentRows}
                  </tbody>
                </table>
                <div style="margin-top: 20px; padding: 16px; background: #fef2f2; border-radius: 8px; border: 1px solid #fecaca;">
                  <p style="margin: 0; font-size: 14px; color: #991b1b; font-weight: 600;">Total outstanding: £${totalOverdue}</p>
                </div>
                <div style="margin-top: 24px;">
                  <a href="https://app.letflowuk.com/dashboard/payments" style="display: inline-block; background: #111827; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 500;">View payments →</a>
                </div>
              </div>
              <div style="padding: 16px 32px; background: #f9fafb; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0; font-size: 12px; color: #9ca3af;">You're receiving this because you have overdue rent payments on LetFlowUK. <a href="https://app.letflowuk.com/dashboard/settings" style="color: #6b7280;">Manage notifications</a></p>
              </div>
            </div>
          </body>
          </html>
        `

        await resend.emails.send({
          from: 'LetFlowUK <alerts@letflowuk.com>',
          to: landlordEmail,
          subject: `⚠️ ${overduePayments.length} overdue rent payment${overduePayments.length !== 1 ? 's' : ''} — £${totalOverdue} outstanding`,
          html,
        })

        emailsSent++
      } catch (e: any) {
        errors.push(`Landlord ${landlordId}: ${e.message}`)
      }
    }

    return res.status(200).json({
      message: `Sent ${emailsSent} landlord alert${emailsSent !== 1 ? 's' : ''}`,
      overdueCount: payments.length,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (e: any) {
    console.error('Landlord alerts error:', e)
    return res.status(500).json({ error: e.message })
  }
}
