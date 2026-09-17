import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ revalidatePath: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));

import { POST } from './route';

describe('catalogue revalidation endpoint', () => {
  beforeEach(() => {
    process.env.SITE_1_REVALIDATE_SECRET = 'test-revalidate-secret-0001';
    mocks.revalidatePath.mockReset();
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
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it('revalidates only after the bearer secret and product key validate', async () => {
    const response = await POST(
      new Request('http://localhost/api/revalidate/catalogue', {
        method: 'POST',
        headers: {
          authorization: 'Bearer test-revalidate-secret-0001',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ productKey: 'rogers-sim-5gb' }),
      }),
    );
    expect(response.status).toBe(200);
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/plans', 'layout');
  });
});
