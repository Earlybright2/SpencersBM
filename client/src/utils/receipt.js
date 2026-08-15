import { jsPDF } from 'jspdf';

const GOLD = [212, 175, 55];

function row(doc, pageW, margin, label, value, y) {
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(10.5);
  doc.text(label, margin, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(240, 240, 240);
  doc.text(String(value), pageW - margin, y, { align: 'right' });
}

export function downloadReceiptPdf({
  ref,
  subtitle = 'RECEIPT',
  date,
  amount,
  currency = 'NGN',
  status = 'Completed',
  rows = [],
  sectionTitle = 'DETAILS',
  note = 'Thank you for your purchase!'
}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 20;

  doc.setFillColor(...GOLD);
  doc.rect(0, 0, pageW, 8, 'F');
  doc.setFillColor(10, 10, 10);
  doc.rect(0, 8, pageW, 2, 'F');

  doc.setTextColor(...GOLD);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.text('SPENCERSBM', margin, 30);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.text(subtitle, margin, 38);

  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.4);
  doc.line(margin, 44, pageW - margin, 44);

  let y = 56;
  row(doc, pageW, margin, 'Reference', ref, y); y += 9;
  row(doc, pageW, margin, 'Amount', `${Number(amount).toLocaleString()} ${currency}`, y); y += 9;
  row(doc, pageW, margin, 'Date & Time', new Date(date).toLocaleString(), y); y += 9;
  row(doc, pageW, margin, 'Status', status, y); y += 16;

  if (rows.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...GOLD);
    doc.setFontSize(11);
    doc.text(sectionTitle, margin, y);
    y += 8;
    for (const [label, value] of rows) {
      row(doc, pageW, margin, label, value, y);
      y += 9;
    }
    y += 6;
  }

  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageW - margin, y);
  y += 14;

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(11);
  doc.setTextColor(220, 220, 220);
  doc.text(note, margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(130, 130, 130);
  doc.text('Support: spencersbm1@hotmail.com', margin, y + 6);

  doc.save(`SpencersBM-Receipt-${ref}.pdf`);
}