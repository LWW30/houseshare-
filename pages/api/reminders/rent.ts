import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { tenantId, paymentId, landlordId } = req.body
  if (!tenantId || !landlordId) return res.status(400).json({ error: 'Missing required fields' })

  try {
    // Fetch tenant details
    const { data: tenant, error: tErr } = await supabaseAdmin
      .from('tenants')
      .select('name, email, portal_token, room:rooms(name, monthly_rent), property:properties(address)')
      .eq('id', tenantId)
      .single()
    if (tErr || !tenant) return res.status(404).json({ error: 'Tenant not found' })

    // Fetch payment details if provided
    let paymentInfo = ''
    if (paymentId) {
      const { data: pay } = await supabaseAdmin
        .from('rent_payments')
        .select('amount, due_date, status')
        .eq('id', paymentId)
        .single()
      if (pay) {
        const due = new Date(pay.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
        paymentInfo = `\n\nYour rent of £${pay.amount} was due on ${due}.`
      }
    }

    const tenantName = (tenant as any).name || 'Tenant'
    const portalUrl = (tenant as any).portal_token
      ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.letflowuk.com'}/tenant/${(tenant as any).portal_token}`
      : null
    const property = (tenant as any).property?.address?.split(',')?.[0] || 'your property'

    // Send email via Resend
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'LetFlow <onboarding@resend.dev>',
        reply_to: 'hello@letflowuk.com',
        to: [(tenant as any).email || 'no-reply@example.com'],
        subject: `Rent reminder — ${property}`,
        html: `
          <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; color: #111827;">
            <div style="margin-bottom: 24px;">
              <span style="font-weight: 700; font-size: 18px;">LetFlow</span>
            </div>
            <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 8px;">Hi ${tenantName},</h2>
            <p style="color: #6b7280; line-height: 1.6; margin-bottom: 16px;">
              This is a friendly reminder that your rent payment is due.${paymentInfo}
            </p>
            <p style="color: #6b7280; line-height: 1.6; margin-bottom: 24px;">
              Please arrange payment as soon as possible. If you have any questions or are experiencing difficulties, 
              please get in touch with your landlord directly.
            </p>
            ${portalUrl ? `
            <a href="${portalUrl}" style="display: inline-block; background: #111827; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: 14px; margin-bottom: 24px;">
              View your tenant portal
            </a>
            ` : ''}
            <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 24px 0;" />
            <p style="color: #9ca3af; font-size: 12px;">
              This reminder was sent by your landlord via LetFlow · UK HMO Management
            </p>
          </div>
        `,
      }),
    })

    if (!emailRes.ok) {
      const errData = await emailRes.json()
      // Log but don't fail — tenant may not have email
      console.error('Resend error:', errData)
      return res.status(200).json({ sent: false, reason: 'no_email_or_resend_error', tenantName })
    }

    return res.status(200).json({ sent: true, tenantName })
  } catch (err: any) {
    console.error('Reminder error:', err)
    return res.status(500).json({ error: err.message })
  }
}
