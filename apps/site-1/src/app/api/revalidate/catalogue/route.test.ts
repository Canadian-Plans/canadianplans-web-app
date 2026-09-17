import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock('next/cache', () => ({
  revalidatePath: mocks.revalidatePath,
  revalidateTag: mocks.revalidateTag,
}));

import { POST } from './route';

function revalidate(productKey: string): Request {
  return new Request('http://localhost/api/revalidate/catalogue', {
    method: 'POST',
    headers: {
      authorization: 'Bearer test-revalidate-secret-0001',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ productKey }),
  });
}

describe('catalogue revalidation endpoint', () => {
  beforeEach(() => {
    process.env.SITE_1_REVALIDATE_SECRET = 'test-revalidate-secret-0001';
    mocks.revalidatePath.mockReset();
    mocks.revalidateTag.mockReset();
  });

  afterEach(() => {
    delete process.env.SITE_1_REVALIDATE_SECRET;
  });

  it('rejects an unauthenticated revalidation request', async () => {
    const response = await POST(
      new Request('http://localhost/api/revalidate/catalogue', {
        method: 'POST',
        body: JSON.stringify({ productKey: 'rogers-sim-5gb' }),
      }),
    );
    expect(response.status).toBe(401);
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it('rejects an invalid product key without revalidating', async () => {
    const response = await POST(revalidate('Not A Product Key'));
    expect(response.status).toBe(400);
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it('invalidates the product key’s own page and the plan index', async () => {
    const response = await POST(revalidate('rogers-sim-5gb'));

    expect(response.status).toBe(200);
    expect(mocks.revalidateTag).toHaveBeenCalledTimes(1);
    expect(mocks.revalidateTag).toHaveBeenCalledWith('plan:rogers-sim-5gb', { expire: 0 });
    expect(mocks.revalidatePath).toHaveBeenCalledTimes(1);
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/plans');
  });

  it('keys revalidation to the product, not to a broad layout', async () => {
    await POST(revalidate('bell-sim-20gb'));

    expect(mocks.revalidateTag).toHaveBeenCalledWith('plan:bell-sim-20gb', { expire: 0 });
    expect(mocks.revalidateTag).not.toHaveBeenCalledWith('plan:rogers-sim-5gb', { expire: 0 });
    expect(mocks.revalidatePath).not.toHaveBeenCalledWith('/plans', 'layout');
  });
});
