// Kept separate from cloud.ts so the UI can use it without loading Firebase.
export function friendlyAuthError(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  const map: Record<string, string> = {
    'auth/invalid-credential': 'Wrong email or password.',
    'auth/wrong-password': 'Wrong email or password.',
    'auth/user-not-found': 'No account with that email — tap "Create account".',
    'auth/email-already-in-use': 'That email already has an account — sign in instead.',
    'auth/weak-password': 'Password needs at least 6 characters.',
    'auth/invalid-email': "That email doesn't look right.",
    'auth/network-request-failed': "You're offline. Try again with a connection.",
    'auth/too-many-requests': 'Too many tries. Wait a minute and try again.',
    'auth/operation-not-allowed': 'Email sign-in is not enabled in the Firebase console yet.',
  };
  return map[code] ?? (e instanceof Error ? e.message : 'Something went wrong.');
}
