import type { NextApiRequest, NextApiResponse } from 'next'
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const supabase = createPagesServerClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return res.status(401).json({ error: 'Not authenticated' })

  const { phoneNumber, userName } = req.body
  if (!phoneNumber) return res.status(400).json({ error: 'phoneNumber required' })

  const { VAPI_API_KEY, VAPI_AGENT_ID, VAPI_PHONE_NUMBER_ID } = process.env
  if (!VAPI_API_KEY || !VAPI_AGENT_ID || !VAPI_PHONE_NUMBER_ID) {
    return res.status(500).json({ error: 'Vapi not configured in env vars' })
  }

  try {
    const callRes = await fetch('https://api.vapi.ai/call/phone', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + VAPI_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        assistantId: VAPI_AGENT_ID,
        phoneNumberId: VAPI_PHONE_NUMBER_ID,
        customer: {
          number: phoneNumber,
          name: userName || 'there'
        },
        assistantOverrides: {
          firstMessage: 'Hi ' + (userName || 'there') + ', it is Lexi from LetFlowUK here. You just signed up — I am calling to give you a quick welcome and help you get set up if you like. Is now an alright time?'
        }
      })
    })

    const data = await callRes.json()
    if (!callRes.ok) return res.status(500).json({ error: 'Call failed', details: data })
    res.json({ ok: true, callId: data.id })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
}
