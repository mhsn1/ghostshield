require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { spawn } = require('child_process')
const fs = require('fs')

const app = express()
app.use(cors())
app.use(express.json())

// Validate that input looks like an actual system prompt
function validatePrompt(prompt) {
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

function stripAnsi(str) {
  return str.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '')
}

app.post('/api/scan', (req, res) => {
  const { prompt, model, provider } = req.body
  if (!prompt) return res.status(400).json({ error: 'prompt required' })

  // Validate prompt looks like a system prompt
  const validationError = validatePrompt(prompt)
  if (validationError) {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.write(`data: ${JSON.stringify({ type: 'error', error: validationError })}\n\n`)
    return res.end()
  }

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('Access-Control-Allow-Origin', '*')

  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`)

  const tmpPrompt = `/tmp/gs_${Date.now()}.txt`
  const tmpResult = `/tmp/gs_result_${Date.now()}.json`
  fs.writeFileSync(tmpPrompt, prompt)

  // Use the shell script that already has the correct bun path
  const child = spawn('/bin/zsh', [
    '-c',
    `source ~/.zshrc 2>/dev/null; cd /Users/mc/ghostshield && /Users/mc/ghostshield/run_scan.sh "${tmpPrompt}" "${model || 'llama-3.1-8b-instant'}" "${provider || 'groq'}" "${tmpResult}"`
  ], {
    env: { ...process.env, GROQ_API_KEY: process.env.GROQ_API_KEY, OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY },
  })

  let buf = ''
  let lastProbe = 0
  let stderrFull = ''

  const handleChunk = (data) => {
    const raw = data.toString()
    stderrFull += raw
    buf += stripAnsi(raw)

    // Process line by line
    const lines = buf.split(/[\r\n]+/)
    buf = lines.pop() || ''

    for (const line of lines) {
      const clean = line.trim()
      if (!clean) continue
      console.log('[scan]', clean)

      // Match ora spinner text: "Running probe 3/14: direct-extraction-v1"
      const m = clean.match(/Running probe\s+(\d+)\/(\d+)[:\s]*(.+)?/i)
      if (m) {
        const current = parseInt(m[1])
        const total = parseInt(m[2])
        const probeName = (m[3] || '').trim()
        const catMatch = probeName.match(/^([a-z_]+?)[-_]/i)

        if (current !== lastProbe) {
          lastProbe = current
          send({
            type: 'progress',
            current,
            total,
            probe: probeName,
            category: catMatch ? catMatch[1] : '',
          })
        }
      }
    }
  }

  child.stdout.on('data', handleChunk)
  child.stderr.on('data', handleChunk)

  child.on('close', (code, signal) => {
    console.log(`exit code: ${code}, signal: ${signal}`)
    try { fs.unlinkSync(tmpPrompt) } catch {}

    if (fs.existsSync(tmpResult)) {
      try {
        const result = JSON.parse(fs.readFileSync(tmpResult, 'utf8'))
        try { fs.unlinkSync(tmpResult) } catch {}
        send({ type: 'complete', result })
      } catch (e) {
        send({ type: 'error', error: `Result parse error: ${e.message}` })
      }
    } else {
      const clean = stripAnsi(stderrFull).replace(/\s+/g, ' ').trim()
      send({ type: 'error', error: clean.slice(-600) || `Process exited (code ${code}, signal ${signal})` })
    }
    res.end()
  })

  child.on('error', (err) => {
    console.error('spawn error:', err)
    send({ type: 'error', error: `Server error: ${err.message}` })
    res.end()
  })

  req.on('close', () => { if (!child.killed) child.kill() })
})

app.listen(3001, () => console.log('GhostShield API → http://localhost:3001'))
