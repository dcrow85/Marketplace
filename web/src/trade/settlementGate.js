// Completing a live exchange is a separate human judgment from agreeing, paying,
// funding, or shipping. Keep the boundary pure so it can be regression-tested.
export function canRecordSettledLive(offer) {
  if (!offer?.live) return false
  return (!offer.cash && offer.state === 'accepted') || (offer.cash && offer.state === 'delivered')
}
