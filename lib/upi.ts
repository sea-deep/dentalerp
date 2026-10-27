export function upiPaymentUri(
  upiId: string,
  clinicName: string,
  balance: number,
  invoiceNo: string
) {
  const query = new URLSearchParams({
    pa: upiId,
    pn: clinicName,
    am: balance.toFixed(2),
    cu: 'INR',
    tn: invoiceNo,
  })
  return `upi://pay?${query}`
}
