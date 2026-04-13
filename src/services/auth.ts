import type { User } from '../types';

// Disposable email domains to block
const DISPOSABLE_DOMAINS = [
  'guerrillamail.com', 'guerrillamail.org', 'guerrillamail.net',
  'tempmail.com', 'temp-mail.org', 'tempmail.net',
  'mailinator.com', 'mailinator.net', 'mailinator.org',
  '10minutemail.com', '10minutemail.net',
  'throwaway.email', 'throwawaymail.com',
  'fakeinbox.com', 'fakemailgenerator.com',
  'getnada.com', 'getairmail.com',
  'yopmail.com', 'yopmail.fr', 'yopmail.net',
  'trashmail.com', 'trashmail.net',
  'dispostable.com', 'mailnesia.com',
  'sharklasers.com', 'spam4.me', 'spamgourmet.com',
  'mytrashmail.com', 'mt2015.com', 'emailondeck.com',
  'tempr.email', 'discard.email', 'discardmail.com',
  'spamfree24.org', 'spamfree24.de', 'spamfree24.eu',
  'mailcatch.com', 'mailslurp.com',
  'moakt.com', 'mohmal.com',
  'dropmail.me', 'maildrop.cc',
  'inboxalias.com', 'burnermail.io',
  'anonbox.net', 'anonymbox.com',
];

const STORAGE_KEY = 'aimighty_user';
const PENDING_VERIFICATION_KEY = 'aimighty_pending_verification';

// Check if email is from a disposable domain
export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  return DISPOSABLE_DOMAINS.includes(domain);
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate password strength
export function isValidPassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }
  return { valid: true };
}

// Generate a simple verification code (6 digits)
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Get current user from localStorage
export function getCurrentUser(): User | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as User;
  } catch {
    return null;
  }
}

// Save user to localStorage
function saveUser(user: User): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

// Sign up with email and password
export async function signUp(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  // Validate email
  if (!isValidEmail(email)) {
    return { success: false, error: 'Please enter a valid email address' };
  }

  // Check for disposable email
  if (isDisposableEmail(email)) {
    return { success: false, error: 'Disposable email addresses are not allowed' };
  }

  // Validate password
  const passwordCheck = isValidPassword(password);
  if (!passwordCheck.valid) {
    return { success: false, error: passwordCheck.error };
  }

  // Check if user already exists
  const existingUser = getCurrentUser();
  if (existingUser && existingUser.email === email.toLowerCase()) {
    return { success: false, error: 'An account with this email already exists' };
  }

  // Generate verification code
  const verificationCode = generateVerificationCode();

  // Store pending verification
  const pending = {
    email: email.toLowerCase(),
    password, // In production, this would be hashed and stored server-side
    code: verificationCode,
    createdAt: Date.now(),
  };
  localStorage.setItem(PENDING_VERIFICATION_KEY, JSON.stringify(pending));

  // In production, this would send an actual email
  console.log(`[DEV] Verification code for ${email}: ${verificationCode}`);

  // For demo purposes, also show an alert
  setTimeout(() => {
    alert(`Demo Mode: Your verification code is ${verificationCode}`);
  }, 500);

  return { success: true };
}

// Verify email with code
export async function verifyEmail(code: string): Promise<{ success: boolean; error?: string; user?: User }> {
  try {
    const pendingStr = localStorage.getItem(PENDING_VERIFICATION_KEY);
    if (!pendingStr) {
      return { success: false, error: 'No pending verification found' };
    }

    const pending = JSON.parse(pendingStr);

    // Check if code matches
    if (pending.code !== code) {
      return { success: false, error: 'Invalid verification code' };
    }

    // Check if code expired (15 minutes)
    if (Date.now() - pending.createdAt > 15 * 60 * 1000) {
      localStorage.removeItem(PENDING_VERIFICATION_KEY);
      return { success: false, error: 'Verification code has expired' };
    }

    // Create verified user
    const user: User = {
      id: `user_${Date.now()}`,
      email: pending.email,
      createdAt: Date.now(),
      emailVerified: true,
      messageCount: 0,
      isPremium: false,
    };

    saveUser(user);
    localStorage.removeItem(PENDING_VERIFICATION_KEY);

    return { success: true, user };
  } catch {
    return { success: false, error: 'Verification failed' };
  }
}

// Sign in with email and password
export async function signIn(email: string, _password: string): Promise<{ success: boolean; error?: string; user?: User }> {
  // Validate email
  if (!isValidEmail(email)) {
    return { success: false, error: 'Please enter a valid email address' };
  }

  // Get stored user
  const storedUser = getCurrentUser();

  // For demo, just check if email matches
  if (!storedUser || storedUser.email !== email.toLowerCase()) {
    return { success: false, error: 'No account found with this email' };
  }

  if (!storedUser.emailVerified) {
    return { success: false, error: 'Please verify your email first' };
  }

  // In production, we'd verify the password hash here
  // For demo, password check is skipped

  return { success: true, user: storedUser };
}

// Sign out
export function signOut(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// Update user message count
export function incrementMessageCount(): void {
  const user = getCurrentUser();
  if (user) {
    user.messageCount += 1;
    saveUser(user);
  }
}

// Check if user has reached free message limit
export function hasReachedFreeLimit(): boolean {
  const user = getCurrentUser();
  if (!user) return true;
  if (user.isPremium) return false;
  return user.messageCount >= 3;
}

// Get remaining free messages
export function getRemainingFreeMessages(): number {
  const user = getCurrentUser();
  if (!user) return 0;
  if (user.isPremium) return Infinity;
  return Math.max(0, 3 - user.messageCount);
}
