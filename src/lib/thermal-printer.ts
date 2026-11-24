import type { Order } from '@/types/domain'
import type { PrintJob, PrinterSettings } from '@/store/printerStore'

export interface PrintContext {
  roomNumber: string
  guestName: string
}

export type PrintDispatchStatus = 'sent' | 'queued' | 'disabled'

export interface PrintDispatchResult {
  status: PrintDispatchStatus
  message: string
}

function widthFor(settings: PrinterSettings) {
  return settings.paperWidth === '58mm' ? 24 : 32
}

function center(value: string, width: number) {
  const text = value.slice(0, width)
  const padding = Math.max(0, width - text.length)
  return `${' '.repeat(Math.floor(padding / 2))}${text}${' '.repeat(Math.ceil(padding / 2))}`
}

function divider(width: number) {
  return '-'.repeat(width)
}

function row(left: string, right: string, width: number) {
  const available = Math.max(1, width - left.length - right.length)
  return `${left.slice(0, width - right.length - 1)}${' '.repeat(available)}${right}`.slice(0, width)
}

export function buildReceiptText(order: Order, context: PrintContext, settings: PrinterSettings) {
  const width = widthFor(settings)
  const lines: string[] = [
    center('HAYATA HOTEL & SUITE', width),
    center('KITCHEN TICKET', width),
    divider(width),
    `Order: ${order.orderNumber}`,
    `Room:  ${context.roomNumber}`,
    `Guest: ${context.guestName}`,
    `Type:  ${order.type}`,
    divider(width),
  ]

  order.items.forEach((item) => {
    lines.push(row(`${item.quantity}x ${item.name}`, formatAmount(item.price * item.quantity), width))
    item.modifiers.forEach((modifier) => lines.push(`   - ${modifier}`.slice(0, width)))
  })

  lines.push(divider(width))
  if (order.instructions) {
    lines.push('NOTE:')
    order.instructions.slice(0, 120).split('\n').forEach((line) => lines.push(` ${line}`.slice(0, width)))
    lines.push(divider(width))
  }
  lines.push(row('TOTAL', formatAmount(order.total), width))
  lines.push('Charge: Room folio')
  lines.push(divider(width))
  lines.push(center(new Date(order.createdAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' }), width))
  lines.push('')
  return lines.join('\n')
}

export function buildTestReceipt(settings: PrinterSettings) {
  const width = widthFor(settings)
  return [
    center('HAYATA HOTEL & SUITE', width),
    center('PRINTER TEST', width),
    divider(width),
    'Kitchen thermal printer',
    'Connection successful.',
    divider(width),
    center('Hayata HMS', width),
    '',
  ].join('\n')
}

function formatAmount(value: number) {
  return `NGN ${value.toFixed(2)}`
}

export function buildBridgeUrl(settings: PrinterSettings, path = '/print') {
  const raw = settings.bridgeHost.trim()
  if (!raw) throw new Error('Enter the printer bridge IP or hostname.')
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`
  let url: URL
  try {
    url = new URL(withScheme)
  } catch {
    throw new Error('Printer bridge address is invalid.')
  }
  if (!url.port && settings.bridgePort.trim()) url.port = settings.bridgePort.trim()
  url.pathname = path
  url.search = ''
  url.hash = ''
  return url.toString()
}

export function createPrintJob(order: Order, context: PrintContext, settings: PrinterSettings): PrintJob {
  return {
    id: `print-${order.id}`,
    orderNumber: order.orderNumber,
    roomNumber: context.roomNumber,
    guestName: context.guestName,
    receiptText: buildReceiptText(order, context, settings),
    createdAt: new Date().toISOString(),
    attempts: 0,
  }
}

export async function sendPrintJob(job: PrintJob, settings: PrinterSettings) {
  const url = buildBridgeUrl(settings)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 6000)
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(settings.authToken.trim() ? { 'x-print-token': settings.authToken.trim() } : {}),
      },
      body: JSON.stringify({
        type: 'kitchen-order',
        orderNumber: job.orderNumber,
        roomNumber: job.roomNumber,
        guestName: job.guestName,
        text: job.receiptText,
        copies: Math.max(1, Math.min(4, settings.copies)),
        printer: { ip: settings.printerIp.trim(), port: Number(settings.printerPort) || 9100 },
      }),
      signal: controller.signal,
    })
    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      throw new Error(detail ? `Printer bridge returned ${response.status}: ${detail.slice(0, 120)}` : `Printer bridge returned ${response.status}`)
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw new Error('Printer bridge timed out.')
    if (error instanceof TypeError) throw new Error('Printer bridge unreachable. Check the IP address, port, and network access.')
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

export async function dispatchKitchenPrint(
  order: Order,
  context: PrintContext,
  settings: PrinterSettings,
  enqueue: (job: Omit<PrintJob, 'id' | 'createdAt' | 'attempts'>) => void,
): Promise<PrintDispatchResult> {
  if (!settings.enabled) return { status: 'disabled', message: 'Automatic printing is off' }
  const job = createPrintJob(order, context, settings)
  try {
    await sendPrintJob(job, settings)
    return { status: 'sent', message: 'Kitchen ticket printed' }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Print request failed'
    enqueue({
      orderNumber: job.orderNumber,
      roomNumber: job.roomNumber,
      guestName: job.guestName,
      receiptText: job.receiptText,
      lastError: message,
    })
    return { status: 'queued', message: 'Printer unavailable · ticket queued' }
  }
}
