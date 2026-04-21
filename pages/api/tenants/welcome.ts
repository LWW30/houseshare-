import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { tenantName, tenantEmail, propertyAddress, roomName, portalUrl, landlordName } = req.body

  if (!tenantEmail || !portalUrl) return res.json({ success: false, reason: 'missing_fields' })

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'LetFlowUK <hello@letflowuk.com>',
        to: [tenantEmail],
        subject: `Welcome to ${propertyAddress || 'your new home'} — your tenant portal is ready`,
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
            <div style="background: #111827; padding: 20px 24px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; font-size: 20px; margin: 0;">Welcome to LetFlowUK</h1>
              <p style="color: #9ca3af; font-size: 14px; margin: 8px 0 0;">Your tenant portal is ready</p>
            </div>
            <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; padding: 32px;">
              <p style="color: #111827; font-size: 16px; margin: 0 0 8px;">Hi ${tenantName || 'there'},</p>
              <p style="color: #374151; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
                ${landlordName || 'Your landlord'} has set up your tenant portal through LetFlowUK. 
                You can use it to check your rent status, view bills, report maintenance issues, and access property documents.
              </p>
              ${propertyAddress ? `<p style="color: #6b7280; font-size: 14px; margin: 0 0 4px;"><strong>Property:</strong> ${propertyAddress}</p>` : ''}
              ${roomName ? `<p style="color: #6b7280; font-size: 14px; margin: 0 0 24px;"><strong>Room:</strong> ${roomName}</p>` : '<br/>'}
              <div style="text-align: center; margin: 32px 0;">
                <a href="${portalUrl}" style="background: #111827; color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-size: 16px; font-weight: 600; display: inline-block;">
                  Open my tenant portal →
                </a>
              </div>
              <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
                Bookmark this link — it's your permanent access to your portal.<br/>
                No app download required.
              </p>
            </div>
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 16px;">
              Powered by LetFlowUK · UK HMO Management · <a href="https://letflowuk.com" style="color: #9ca3af;">letflowuk.com</a>
            </p>
          </div>
        `,
      }),
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.message || 'Email failed')
    }

    res.json({ success: true })
  } catch (err: any) {
    console.error('Welcome email error:', err)
    res.json({ success: false, error: err.message })
  }
}
