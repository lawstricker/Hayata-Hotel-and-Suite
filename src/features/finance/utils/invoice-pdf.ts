import { jsPDF } from 'jspdf'
import { format, money, multiply, subtract } from '@/lib/money'
import type { FinanceInvoice } from '@/types/domain'

const amount = (value: string, currency: string) => `${currency} ${format(money(value, currency), { locale: 'en-NG', symbol: false })}`

/** Generates a downloadable PDF invoice document from saved invoice data. */
export function generateInvoicePdf(invoice: FinanceInvoice) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const right = 192

  doc.setFillColor(9, 15, 18)
  doc.rect(0, 0, 210, 40, 'F')
  doc.setTextColor(201, 168, 76)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.text('HAYATA', 18, 20)
  doc.setFontSize(9)
  doc.text('HOTEL & SUITE', 18, 28)
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.text('INVOICE', right, 20, { align: 'right' })
  doc.setFontSize(9)
  doc.text(invoice.number, right, 28, { align: 'right' })

  doc.setTextColor(30, 41, 59)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('BILL TO', 18, 55)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(12)
  doc.text(invoice.customerName, 18, 63)
  doc.setFontSize(9)
  doc.text(`Issued: ${invoice.issueDate.slice(0, 10)}`, right, 55, { align: 'right' })
  doc.text(`Due: ${invoice.dueDate.slice(0, 10)}`, right, 61, { align: 'right' })
  doc.text(`Status: ${invoice.status}`, right, 67, { align: 'right' })

  let y = 82
  doc.setFillColor(241, 245, 249)
  doc.rect(18, y - 6, 174, 10, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('DESCRIPTION', 22, y)
  doc.text('QTY', 125, y, { align: 'right' })
  doc.text('UNIT PRICE', 158, y, { align: 'right' })
  doc.text('AMOUNT', right, y, { align: 'right' })
  y += 8

  doc.setFont('helvetica', 'normal')
  for (const line of invoice.lines) {
    const label = line.description.length > 58 ? `${line.description.slice(0, 55)}...` : line.description
    doc.text(label, 22, y)
    doc.text(line.quantity, 125, y, { align: 'right' })
    doc.text(format(money(line.unitPrice, invoice.currency), { locale: 'en-NG', symbol: false }), 158, y, { align: 'right' })
    const total = multiply(money(line.unitPrice, invoice.currency), line.quantity)
    doc.text(format(total, { locale: 'en-NG', symbol: false }), right, y, { align: 'right' })
    y += 8
    if (y > 240) { doc.addPage(); y = 30 }
  }

  y += 6
  const totals: Array<[string, string]> = [
    ['Subtotal', amount(invoice.subtotal, invoice.currency)],
    ['Discount', amount(invoice.discount, invoice.currency)],
    ['Tax', amount(invoice.tax, invoice.currency)],
    ['Amount paid', amount(invoice.amountPaid, invoice.currency)],
  ]
  for (const [label, value] of totals) {
    doc.text(label, 145, y, { align: 'right' })
    doc.text(value, right, y, { align: 'right' })
    y += 7
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('TOTAL DUE', 145, y + 2, { align: 'right' })
  const due = subtract(money(invoice.total, invoice.currency), money(invoice.amountPaid, invoice.currency))
  doc.text(amount(due.amount, invoice.currency), right, y + 2, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139)
  doc.text('Thank you for choosing Hayata Hotel & Suite. Please quote the invoice number with your payment.', 18, 282)
  doc.text('Generated from Hayata Finance · ' + new Date().toISOString().slice(0, 10), 18, 288)

  doc.save(`${invoice.number}.pdf`)
}
