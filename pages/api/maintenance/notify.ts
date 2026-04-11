import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

// Admin client to read auth.users
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { tenantName, propertyAddress, title, description, priority, landlordEmail } = req.body

  if (!title) return res.status(400).json({ error: 'Missing required fields' })

  // Use provided email or skip if none
  const toEmail = landlordEmail
  if (!toEmail) return res.json({ success: true, skipped: true })

  const priorityLabel = priority === 'urgent' ? '🔴 URGENT' : priority === 'high' ? '🟠 High' : priority === 'medium' ? '🟡 Medium' : '🟢 Low'

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'LetFlowUK <onboarding@resend.dev>',
        reply_to: 'hello@letflowuk.com',
        to: [toEmail],
        subject: `${priorityLabel} Maintenance: ${title}`,
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
            <div style="background: #111827; padding: 20px 24px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; font-size: 18px; margin: 0;">🔧 New maintenance request</h1>
            </div>
            <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; padding: 24px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 120px;">Tenant</td><td style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #111827;">${tenantName || 'Unknown'}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Property</td><td style="padding: 8px 0; font-size: 14px; color: #111827;">${propertyAddress || 'Unknown'}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Priority</td><td style="padding: 8px 0; font-size: 14px;">${priorityLabel}</td></tr>
                <tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px; vertical-align: top;">Issue</td><td style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #111827;">${title}</td></tr>
                ${description ? `<tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px; vertical-align: top;">Details</td><td style="padding: 8px 0; font-size: 14px; color: #374151;">${description}</td></tr>` : ''}
              </table>
              <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <a href="https://houseshare-five.vercel.app/dashboard/maintenance" style="background: #111827; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">View in LetFlowUK →</a>
              </div>
            </div>
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 16px;">LetFlowUK · UK HMO Management</p>
          </div>
        `,
      }),
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.message || 'Email send failed')
    }

    res.json({ success: true })
  } catch (err: any) {
    console.error('Maintenance email error:', err)
    // Don't fail the whole request — email is best-effort
    res.json({ success: false, error: err.message })
  }
}
