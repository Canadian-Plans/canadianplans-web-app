import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import RecoveryPage from './page';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getLevel: vi.fn(),
  listFactors: vi.fn(),
  challengeAndVerify: vi.fn(),
  updateUser: vi.fn(),
  resetPasswordForEmail: vi.fn(),
}));
vi.mock('../../lib/supabase-auth', () => ({
  isStaffAuthConfigured: () => true,
  getStaffAuth: () => ({
    getSession: mocks.getSession,
    updateUser: mocks.updateUser,
    resetPasswordForEmail: mocks.resetPasswordForEmail,
    mfa: {
      getAuthenticatorAssuranceLevel: mocks.getLevel,
      listFactors: mocks.listFactors,
      challengeAndVerify: mocks.challengeAndVerify,
    },
  }),
}));

const factor = { id: 'totp-1', friendly_name: 'Phone', status: 'verified' };
function openRecoveryLink() {
  window.history.pushState({}, '', '/recovery?mode=update');
}
function typePassword(value: string) {
  fireEvent.change(screen.getByLabelText('New password'), { target: { value } });
  fireEvent.click(screen.getByRole('button', { name: 'Update password' }));
}

beforeEach(() => {
  vi.clearAllMocks();
  window.history.pushState({}, '', '/recovery');
  mocks.getSession.mockResolvedValue({ data: { session: { access_token: 'recovery' } } });
  mocks.getLevel.mockResolvedValue({
    data: { currentLevel: 'aal1', nextLevel: 'aal2' },
    error: null,
  });
  mocks.listFactors.mockResolvedValue({ data: { totp: [factor] }, error: null });
  mocks.challengeAndVerify.mockResolvedValue({ error: null });
  mocks.updateUser.mockResolvedValue({ error: null });
  mocks.resetPasswordForEmail.mockResolvedValue({ error: null });
});

it('asks for the authenticator code before the password when the account has MFA', async () => {
  openRecoveryLink();
  render(<RecoveryPage />);
  expect(await screen.findByLabelText('Authenticator code')).toBeTruthy();
  expect(screen.queryByLabelText('New password')).toBeNull();

  fireEvent.change(screen.getByLabelText('Authenticator code'), { target: { value: '123456' } });
  fireEvent.click(screen.getByRole('button', { name: 'Verify code' }));
  await waitFor(() =>
    expect(mocks.challengeAndVerify).toHaveBeenCalledWith({ factorId: 'totp-1', code: '123456' }),
  );
  typePassword('a-new-long-password');
  await waitFor(() =>
    expect(mocks.updateUser).toHaveBeenCalledWith({ password: 'a-new-long-password' }),
  );
  expect(await screen.findByText(/Password updated/)).toBeTruthy();
});

it('goes straight to the password when the session is already aal2', async () => {
  mocks.getLevel.mockResolvedValue({
    data: { currentLevel: 'aal2', nextLevel: 'aal2' },
    error: null,
  });
  openRecoveryLink();
  render(<RecoveryPage />);
  expect(await screen.findByLabelText('New password')).toBeTruthy();
  expect(mocks.listFactors).not.toHaveBeenCalled();
});

it('shows the code step when the update is refused for insufficient assurance', async () => {
  mocks.getLevel.mockResolvedValue({
    data: { currentLevel: 'aal2', nextLevel: 'aal2' },
    error: null,
  });
  mocks.updateUser.mockResolvedValue({ error: { code: 'insufficient_aal' } });
  openRecoveryLink();
  render(<RecoveryPage />);
  await screen.findByLabelText('New password');
  typePassword('a-new-long-password');
  expect(await screen.findByLabelText('Authenticator code')).toBeTruthy();
  expect(screen.getByText(/Enter your authenticator code first/)).toBeTruthy();
});

it('explains the real reason for same-password and weak-password refusals', async () => {
  mocks.getLevel.mockResolvedValue({
    data: { currentLevel: 'aal1', nextLevel: 'aal1' },
    error: null,
  });
  openRecoveryLink();
  render(<RecoveryPage />);
  await screen.findByLabelText('New password');
  mocks.updateUser.mockResolvedValueOnce({ error: { code: 'same_password' } });
  typePassword('old-password-again');
  expect(await screen.findByText(/different from your current one/)).toBeTruthy();
  mocks.updateUser.mockResolvedValueOnce({ error: { code: 'weak_password' } });
  typePassword('password');
  expect(await screen.findByText(/too weak/)).toBeTruthy();
});

it('says the link expired when there is no recovery session', async () => {
  mocks.getSession.mockResolvedValue({ data: { session: null } });
  openRecoveryLink();
  render(<RecoveryPage />);
  expect(await screen.findByText(/expired or was already used/)).toBeTruthy();
  expect(screen.queryByLabelText('New password')).toBeNull();
});

it('keeps the email step identical whether or not the account exists', async () => {
  render(<RecoveryPage />);
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'who@example.test' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send recovery email' }));
  expect(await screen.findByText(/If that account exists/)).toBeTruthy();
  mocks.resetPasswordForEmail.mockRejectedValueOnce(new Error('nope'));
  fireEvent.click(screen.getByRole('button', { name: 'Send recovery email' }));
  expect(await screen.findByText(/If that account exists/)).toBeTruthy();
});
