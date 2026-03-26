import { runScan } from './src/scanner'
import 'dotenv/config'

// Validate that input looks like an actual system prompt
function validatePrompt(prompt: string): string | null {
  const t = prompt.trim()
  if (t.length < 20) return 'Prompt too short — must be at least 20 characters.'

  const keywords = [
    'you are', "you're", 'your role', 'your task', 'your job',
    'act as', 'behave as', 'respond as', 'function as',
    'assistant', 'chatbot', 'bot', 'agent', 'helper',
    'must', 'must not', 'never', 'always', 'do not', "don't", 'cannot', "can't",
    'should', 'should not', "shouldn't",
    'respond', 'reply', 'answer', 'help', 'assist', 'support',
    'instruction', 'rule', 'guideline', 'policy', 'restrict',
    'user', 'customer', 'client',
    'system prompt', 'system message',
    'do not reveal', 'do not share', 'keep secret', 'confidential',
    'persona', 'character', 'role',
  ]
  const lower = t.toLowerCase()
  if (!keywords.some(kw => lower.includes(kw))) {
    return 'This does not look like a system prompt. Enter the instructions/rules you give to your AI model.'
  }
  return null // valid
}

const server = Bun.serve({
  port: 3001,
  idleTimeout: 0,

  async fetch(req: Request) {
    const url = new URL(req.url)

    // CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      })
    }

    if (url.pathname === '/api/scan' && req.method === 'POST') {
      const body = await req.json() as { prompt: string; model?: string; provider?: string; probeLimit?: number }
      const { prompt, model, provider, probeLimit } = body

      if (!prompt) {
        return new Response(JSON.stringify({ error: 'prompt required' }), { status: 400 })
      }

      // Validate prompt looks like a system prompt
      const validationError = validatePrompt(prompt)
      if (validationError) {
        return new Response(
          `data: ${JSON.stringify({ type: 'error', error: validationError })}\n\n`,
          { headers: { 'Content-Type': 'text/event-stream', 'Access-Control-Allow-Origin': '*' } }
        )
      }

      const apiKey =
        (provider || 'groq') === 'groq'
          ? process.env.GROQ_API_KEY!
          : process.env.OPENROUTER_API_KEY!

      if (!apiKey) {
        return new Response(
          `data: ${JSON.stringify({ type: 'error', error: `API key not set for provider: ${provider || 'groq'}` })}\n\n`,
          { headers: { 'Content-Type': 'text/event-stream', 'Access-Control-Allow-Origin': '*' } }
        )
      }

      const stream = new ReadableStream({
        async start(controller) {
          const send = (obj: object) => {
            controller.enqueue(
              new TextEncoder().encode(`data: ${JSON.stringify(obj)}\n\n`)
            )
          }

          try {
            const result = await runScan(
              {
                systemPrompt: prompt,
                model: model || 'llama-3.1-8b-instant',
                apiKey,
                provider: (provider || 'groq') as 'groq' | 'openrouter',
              },
              (current, total, probeName) => {
                const category = probeName?.split(/[-_]/)?.[0] || ''
                send({ type: 'progress', current, total, probe: probeName, category })
              },
              probeLimit
            )
            send({ type: 'complete', result })
          } catch (err: any) {
            send({ type: 'error', error: err.message || 'Scan failed' })
          } finally {
            controller.close()
          }
        },
      })

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    return new Response('Not found', { status: 404 })
  },
})

console.log(`GhostShield API → http://localhost:${server.port}`)
