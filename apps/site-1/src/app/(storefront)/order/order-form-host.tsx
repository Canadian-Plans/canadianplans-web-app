'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { OrderForm, type OrderFormProps } from './order-form';

/**
 * Keeps the order form mounted through a server re-render of its page.
 *
 * A Server Action that sets the draft cookie (saving the details, the first
 * submit attempt) makes Next render the page again. That render can lose the
 * selected plan: the draft has just become an order and can no longer be read
 * back, or the plan was withdrawn. Remounting the form then would drop the
 * confirmation, or the message the customer is reading, and show the plan list
 * instead. So the plan stays selected until the address changes, which is how
 * the customer chooses another plan.
 */
export function OrderFormHost(props: OrderFormProps) {
  const address = useSearchParams().toString();
  const [held, setHeld] = useState({ address, selected: props.selected });
  const selected = held.address === address ? (props.selected ?? held.selected) : props.selected;
  if (held.address !== address || held.selected !== selected) setHeld({ address, selected });
  return (
    <OrderForm
      key={`${selected?.productId ?? 'plan-list'}:${props.province ?? ''}`}
      {...props}
      selected={selected}
    />
  );
}
