import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const authHeader = req.headers.authorization
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).json({ error: 'Unauthorized' })

  const today = new Date()
  const month = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0')

  try {
    const { data: payments, error } = await supabase
      .from('rent_payments')
      .select(`id, amount, status, due_date, tenant:tenants(id, name, email), room:rooms(name, property:properties(address))`)
      .in('status', ['pending', 'overdue', 'late'])
      .gte('due_date', month + '-01')
    if (error) throw error

    const results = []
    for (const payment of payments || []) {
      const tenant = payment.tenant as any
      if (!tenant?.email || !tenant.email.includes('@')) continue

      const dueDate = new Date(payment.due_date)
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / 86400000)
      const shouldSend = payment.status === 'overdue' || payment.status === 'late' || daysUntilDue <= 3
      if (!shouldSend) continue

      const { data: existingLog } = await supabase.from('reminder_logs').select('id').eq('payment_id', payment.id).gte('sent_at', today.toISOString().split('T')[0]).maybeSingle()
      if (existingLog) continue

      const isOverdue = payment.status === 'overdue' || payment.status === 'late'
      const room = payment.room as any
      const subject = isOverdue ? 'Rent overdue — action needed' : `Reminder: rent due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}`
      const formattedDate = dueDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${subject}</title></head><body style="margin:0;padding:0;background:#f9fafb;font-family:Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 20px;"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
<tr><td style="padding-bottom:24px;text-align:center;"><span style="font-size:18px;font-weight:600;color:#111827;">LetFlow</span></td></tr>
<tr><td style="background:${isOverdue ? '#fef2f2' : '#fffbeb'};border:1px solid ${isOverdue ? '#fecaca' : '#fde68a'};border-radius:12px 12px 0 0;padding:28px 32px 24px;border-bottom:none;">
<p style="margin:0 0 8px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:${isOverdue ? '#dc2626' : '#d97706'};">${isOverdue ? 'Action required' : 'Payment reminder'}</p>
<h1 style="margin:0;font-size:22px;font-weight:600;color:#111827;">${isOverdue ? 'Your rent is overdue' : `Rent due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}`}</h1>
</td></tr>
<tr><td style="background:#ffffff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:28px 32px;">
<p style="margin:0 0 20px;font-size:15px;color:#374151;">Hi ${tenant.name},</p>
<p style="margin:0 0 24px;font-size:15px;color:#374151;">${isOverdue ? `Your rent payment of <strong>£${payment.amount}</strong> was due on ${formattedDate} and has not been received. Please arrange payment as soon as possible.` : `Your rent payment of <strong>£${payment.amount}</strong> is due on ${formattedDate}.`}</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:24px;">
<tr><td style="padding:16px 20px;border-bottom:1px solid #e5e7eb;"><span style="font-size:12px;color:#9ca3af;display:block;margin-bottom:3px;">Amount due</span><span style="font-size:20px;font-weight:600;color:#111827;">£${payment.amount}</span></td></tr>
<tr><td style="padding:16px 20px;border-bottom:1px solid #e5e7eb;"><span style="font-size:12px;color:#9ca3af;display:block;margin-bottom:3px;">Due date</span><span style="font-size:14px;color:#374151;">${formattedDate}</span></td></tr>
${room?.property?.address ? `<tr><td style="padding:16px 20px;"><span style="font-size:12px;color:#9ca3af;display:block;margin-bottom:3px;">Property</span><span style="font-size:14px;color:#374151;">${room.property.address}${room.name ? ' — ' + room.name : ''}</span></td></tr>` : ''}
</table>
<p style="margin:0;font-size:14px;color:#6b7280;">If you have already paid, please ignore this reminder. If you have questions, contact your landlord directly.</p>
</td></tr>
<tr><td style="padding:24px 0 0;text-align:center;"><p style="margin:0;font-size:12px;color:#9ca3af;">Sent by LetFlow — UK HMO Management</p></td></tr>
</table></td></tr></table></body></html>`

      let emailSent = false
      if (process.env.RESEND_API_KEY) {
        try {
          const resendRes = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: process.env.EMAIL_FROM || 'LetFlow <noreply@letflowuk.com>', to: [tenant.email], subject, html }) })
          emailSent = resendRes.ok
        } catch (e) { console.error('Email send failed:', e) }
      }

      await supabase.from('reminder_logs').insert({ tenant_id: tenant.id, payment_id: payment.id, type: isOverdue ? 'overdue' : 'due_soon', sent_at: new Date().toISOString(), email_sent: emailSent })
      results.push({ tenant: tenant.name, email: tenant.email, status: payment.status, email_sent: emailSent })
    }

    return res.status(200).json({ success: true, processed: results.length, results })
  } catch (error: any) {
    console.error('Reminder error:', error)
    return res.status(500).json({ error: error.message })
  }
}
