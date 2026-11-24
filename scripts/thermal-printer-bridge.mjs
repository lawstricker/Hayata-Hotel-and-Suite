import http from 'node:http'
import net from 'node:net'

const PORT = Number(process.env.BRIDGE_PORT || 8787)
const DEFAULT_PRINTER_IP = process.env.PRINTER_IP || '127.0.0.1'
const DEFAULT_PRINTER_PORT = Number(process.env.PRINTER_PORT || 9100)
const TOKEN = process.env.BRIDGE_TOKEN || ''
const DRY_RUN = process.env.DRY_RUN === '1'
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*'

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-print-token')
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
}

function json(res, status, body) {
  setCors(res)
  res.writeHead(status)
  res.end(JSON.stringify(body))
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (chunk) => {
      raw += chunk
      if (raw.length > 1_000_000) {
        reject(new Error('Request body too large'))
        req.destroy()
      }
    })
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {})
      } catch {
        reject(new Error('Invalid JSON body'))
      }
    })
    req.on('error', reject)
  })
}

function printableAscii(value) {
  return value.split('').map((character) => {
    const code = character.charCodeAt(0)
    return (code >= 32 && code <= 126) || code === 10 ? character : '?'
  }).join('')
}

function stripControlSequences(value) {
  let output = ''
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index)
    if (code === 27 || code === 29) { index += 1; continue }
    output += value[index]
  }
  return output
}

function toEscPos(text, copies) {
  const normalized = printableAscii(String(text || '').replaceAll('₦', 'NGN'))
    .split('\n')
    .map((line) => line.replace(/\s+$/, ''))
    .join('\n')
  const chunks = [Buffer.from('\x1B@'), Buffer.from('\x1Ba\x01')]
  for (let copy = 0; copy < copies; copy += 1) {
    chunks.push(Buffer.from(`${normalized}\n\n\n`))
  }
  chunks.push(Buffer.from('\x1DV\x42\x00'))
  return Buffer.concat(chunks)
}

function sendToPrinter(host, port, buffer) {
  return new Promise((resolve, reject) => {
    if (DRY_RUN) {
      console.log('\n--- Hayata kitchen ticket (dry run) ---\n')
      console.log(stripControlSequences(buffer.toString('latin1')))
      resolve()
      return
    }
    const socket = net.createConnection({ host, port })
    const timer = setTimeout(() => {
      socket.destroy()
      reject(new Error('Printer connection timed out'))
    }, 5000)
    socket.once('connect', () => {
      socket.write(buffer, (error) => {
        clearTimeout(timer)
        if (error) {
          socket.destroy()
          reject(error)
          return
        }
        socket.end()
        resolve()
      })
    })
    socket.once('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
  })
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    setCors(res)
    res.writeHead(204)
    res.end()
    return
  }

  if (req.url === '/health' && req.method === 'GET') {
    json(res, 200, { ok: true, dryRun: DRY_RUN, printer: `${DEFAULT_PRINTER_IP}:${DEFAULT_PRINTER_PORT}` })
    return
  }

  if (!['/print', '/test'].includes(req.url || '') || req.method !== 'POST') {
    json(res, 404, { error: 'Not found' })
    return
  }

  if (TOKEN && req.headers['x-print-token'] !== TOKEN) {
    json(res, 401, { error: 'Invalid print token' })
    return
  }

  try {
    const body = await readJson(req)
    const printer = body.printer && typeof body.printer === 'object' ? body.printer : {}
    const host = String(printer.ip || DEFAULT_PRINTER_IP).slice(0, 120)
    const port = Number(printer.port || DEFAULT_PRINTER_PORT)
    const copies = Math.max(1, Math.min(4, Number(body.copies) || 1))
    const text = String(body.text || body.orderNumber || 'Hayata Hotel & Suite')
    await sendToPrinter(host, port, toEscPos(text, copies))
    json(res, 200, { ok: true, sentTo: `${host}:${port}`, dryRun: DRY_RUN })
  } catch (error) {
    json(res, 502, { error: error instanceof Error ? error.message : 'Print failed' })
  }
})

server.listen(PORT, () => {
  console.log(`Hayata thermal print bridge listening on http://0.0.0.0:${PORT}`)
  console.log(`Default printer target: ${DEFAULT_PRINTER_IP}:${DEFAULT_PRINTER_PORT}${DRY_RUN ? ' (dry run)' : ''}`)
  if (TOKEN) console.log('Bridge token authentication is enabled.')
})
