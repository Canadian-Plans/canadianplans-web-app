export const orderConfirmationCopy = {
  saved: {
    heading: 'Order received',
    description: 'Keep this reference: it is how we track your order.',
    email: (email: string) =>
      `We've emailed a confirmation to ${email}. We'll contact you if we need anything else.`,
  },
  missing: {
    heading: 'Not saved',
    description: 'Your order was not saved. Please try again — no order exists yet.',
  },
  preview: {
    heading: 'Preview completed',
    description:
      'The form passed validation. No order was created, no installation was booked, and no confirmation email or message was sent.',
    back: 'Back to form',
  },
} as const;
