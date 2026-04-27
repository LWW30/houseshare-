/**
 * LetFlowUK — Lexi Setup Script
 * Creates the Lexi agent in Vapi. Run once.
 *
 * Usage:
 *   VAPI_API_KEY=your_key_here node create-agent.js
 *
 * Steps first:
 *   1. Sign up at vapi.ai
 *   2. Get API key from vapi.ai/dashboard > API Keys
 *   3. Run this script
 *   4. Buy a UK number in Vapi dashboard > Phone Numbers > Buy
 *   5. Assign it to the agent ID printed below
 */

const fs = require('fs')
const path = require('path')

const VAPI_API_KEY = process.env.VAPI_API_KEY
if (!VAPI_API_KEY) {
  console.error('ERROR: Set VAPI_API_KEY environment variable first')
  console.error('Usage: VAPI_API_KEY=your_key node create-agent.js')
  process.exit(1)
}

const SYSTEM_PROMPT = fs.readFileSync(path.join(__dirname, 'system-prompt.txt'), 'utf8')

const agentConfig = {
  name: 'Lexi - LetFlowUK Support',

  // Charlotte — ElevenLabs British English, warm and natural
  // To try other voices, change voiceId in Vapi playground first
  voice: {
    provider: '11labs',
    voiceId: 'XB0fDUnXU5powFXDhCwa', // Charlotte (British, warm)
    stability: 0.4,
    similarityBoost: 0.8,
    style: 0.15,
    useSpeakerBoost: true,
    optimizeStreamingLatency: 3
  },

  model: {
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    temperature: 0.85,
    messages: [{ role: 'system', content: SYSTEM_PROMPT }],
    maxTokens: 180,
    emotionRecognitionEnabled: true
  },

  transcriber: {
    provider: 'deepgram',
    model: 'nova-2',
    language: 'en-GB',
    smartFormat: true,
    punctuate: true,
    keywords: ['LetFlowUK', 'HMO', 'MTD', 'EICR', 'EPC', 'GoCardless', 'Awaab']
  },

  firstMessage: 'Hello, LetFlowUK, Lexi speaking. How can I help?',
  endCallMessage: 'Brilliant, well I hope that has been helpful. Give us a call back if you need anything else. Bye for now!',
  endCallPhrases: ['goodbye', 'bye', 'bye bye', 'thanks bye', 'cheers bye', 'that is all thanks', 'thank you bye', 'cheers', 'ta ta'],

  silenceTimeoutSeconds: 20,
  maxDurationSeconds: 1800,
  backgroundSound: 'office',
  backchannelingEnabled: true,
  backgroundDenoisingEnabled: true,

  serverUrl: 'https://app.letflowuk.com/api/vapi/webhook',
  serverUrlSecret: process.env.VAPI_WEBHOOK_SECRET || 'change-me-in-vercel'
}

async function createAgent () {
  console.log('Creating Lexi in Vapi...')

  const res = await fetch('https://api.vapi.ai/assistant', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + VAPI_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(agentConfig)
  })

  const data = await res.json()

  if (!res.ok) {
    console.error('Failed to create agent:')
    console.error(JSON.stringify(data, null, 2))
    process.exit(1)
  }

  console.log('')
  console.log('Lexi created successfully!')
  console.log('Agent ID:', data.id)
  console.log('')
  console.log('Next steps:')
  console.log('1. Go to vapi.ai/dashboard > Phone Numbers > Buy Number')
  console.log('   Filter by United Kingdom (+44), pick a number')
feat: Lexi create-agent setup script  console.log('   Copy the Phone Number ID')
  console.log('')
  console.log('2. Add these to Vercel Environment Variables:')
  console.log('   VAPI_API_KEY      = ' + VAPI_API_KEY.slice(0, 8) + '...')
  console.log('   VAPI_AGENT_ID     = ' + data.id)
  console.log('   VAPI_PHONE_NUMBER_ID = (from step 1)')
  console.log('   VAPI_WEBHOOK_SECRET  = (any random string)')
  console.log('')
  console.log('3. The webhook and outbound routes are already in your repo at')
  console.log('   pages/api/vapi/webhook.ts')
  console.log('   pages/api/vapi/outbound-call.ts')
  console.log('')
  console.log('4. Call your UK number to test. Lexi should answer within 2 rings.')
  console.log('')
  console.log('Alternative voices to try in Vapi playground:')
  console.log('   Alice:   Xb7hH8MSUJpSbSDYk0k2')
  console.log('   Matilda: XrExE9yKIg1WjnnlVkGX')
  console.log('   Sarah:   EXAVITQu4vr4xnSDxMaL')
}

createAgent().catch(console.error)
