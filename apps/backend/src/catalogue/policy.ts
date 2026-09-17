export const quoteWithdrawalPolicies = ['immediate', 'honour_until_expiry', 'unresolved'] as const;
export type QuoteWithdrawalPolicy = (typeof quoteWithdrawalPolicies)[number];

export function loadQuoteWithdrawalPolicy(
  value = process.env.QUOTE_WITHDRAWAL_POLICY,
): QuoteWithdrawalPolicy {
  return value === 'immediate' || value === 'honour_until_expiry' ? value : 'unresolved';
}
