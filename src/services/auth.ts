import type { User } from '../types';
import type { LanguageCode } from '../data/translations';

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

// Storage keys
const USER_STORAGE_KEY = 'aimighty_user';
const SESSION_STORAGE_KEY = 'aimighty_session';
const ACCOUNTS_STORAGE_KEY = 'aimighty_accounts';

// Session interface
export interface Session {
  userId: string;
  email: string;
  beliefSystemId?: string;
  language?: LanguageCode;
  lastActive: number;
}

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

// Simple hash for localStorage (NOT secure - production should use bcrypt on server)
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

// Get stored accounts
function getStoredAccounts(): Record<string, { passwordHash: string; userId: string }> {
  try {
    const stored = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

// Save account
function saveAccount(email: string, passwordHash: string, userId: string): void {
  const accounts = getStoredAccounts();
  accounts[email.toLowerCase()] = { passwordHash, userId };
  localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
}

// Get current user from localStorage
export function getCurrentUser(): User | null {
  try {
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as User;
  } catch {
    return null;
  }
}

// Save user to localStorage
function saveUser(user: User): void {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

// Get current session
export function getSession(): Session | null {
  try {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as Session;
  } catch {
    return null;
  }
}

// Save session
export function saveSession(session: Session): void {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

// Update session with belief system
export function updateSessionBelief(beliefSystemId: string): void {
  const session = getSession();
  if (session) {
    session.beliefSystemId = beliefSystemId;
    session.lastActive = Date.now();
    saveSession(session);
  }
}

// Update session with language
export function updateSessionLanguage(language: LanguageCode): void {
  const session = getSession();
  if (session) {
    session.language = language;
    session.lastActive = Date.now();
    saveSession(session);
  }
}

// Sign up with email and password (no verification - direct account creation)
export async function signUp(email: string, password: string): Promise<{ success: boolean; error?: string; user?: User }> {
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

  // Check if account already exists
  const accounts = getStoredAccounts();
  if (accounts[email.toLowerCase()]) {
    return { success: false, error: 'An account with this email already exists. Please sign in.' };
  }

  // Create user
  const userId = `user_${Date.now()}`;
  const user: User = {
    id: userId,
    email: email.toLowerCase(),
    createdAt: Date.now(),
    emailVerified: true, // Skip verification for now
    messageCount: 0,
    isPremium: false,
  };

  // Save account and user
  const passwordHash = simpleHash(password);
  saveAccount(email, passwordHash, userId);
  saveUser(user);

  // Create session
  const session: Session = {
    userId,
    email: email.toLowerCase(),
    lastActive: Date.now(),
  };
  saveSession(session);

  return { success: true, user };
}

// Sign in with email and password
export async function signIn(email: string, password: string): Promise<{ success: boolean; error?: string; user?: User }> {
  // Validate email
  if (!isValidEmail(email)) {
    return { success: false, error: 'Please enter a valid email address' };
  }

  // Get stored accounts
  const accounts = getStoredAccounts();
  const account = accounts[email.toLowerCase()];

  if (!account) {
    return { success: false, error: 'No account found with this email' };
  }

  // Verify password
  const passwordHash = simpleHash(password);
  if (account.passwordHash !== passwordHash) {
    return { success: false, error: 'Incorrect password' };
  }

  // Get or create user object
  let user = getCurrentUser();
  if (!user || user.id !== account.userId) {
    user = {
      id: account.userId,
      email: email.toLowerCase(),
      createdAt: Date.now(),
      emailVerified: true,
      messageCount: 0,
      isPremium: false,
    };
    saveUser(user);
  }

  // Create session
  const session: Session = {
    userId: user.id,
    email: email.toLowerCase(),
    lastActive: Date.now(),
  };
  saveSession(session);

  return { success: true, user };
}

// Sign out
export function signOut(): void {
  localStorage.removeItem(USER_STORAGE_KEY);
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

// Check if user is logged in (has valid session)
export function isLoggedIn(): boolean {
  const session = getSession();
  const user = getCurrentUser();
  return !!session && !!user && session.userId === user.id;
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
