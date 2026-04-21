import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { tenantName, propertyAddress, title, description, priority, landlordEmail } = req.body

  if (!landlordEmail || !title) return res.json({ success: false })

  const priorityLabel = priority === 'urgent' ? '🔴 URGENT' : priority === 'high' ? '🟠 High' : priority === 'medium' ? '🟡 Medium' : '🟢 Low'

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'LetFlowUK <hello@letflowuk.com>',
        to: [landlordEmail],
        subject: `${priorityLabel} Maintenance: ${title}`,
        html: `<p><b>Tenant:</b> ${tenantName}</p><p><b>Property:</b> ${propertyAddress}</p><p><b>Issue:</b> ${title}</p><p>${description || ''}</p><p><a href="https://houseshare-five.vercel.app/dashboard/maintenance">View in LetFlowUK →</a></p>`,
      }),
    })
    res.json({ success: true })
  } catch (err: any) {
    res.json({ success: false, error: err.message })
  }
}
