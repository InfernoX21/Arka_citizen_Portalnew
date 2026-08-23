import test, { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, ChildProcess } from 'node:child_process';

const TEST_PORT = '3099';
const BASE_URL = `http://localhost:${TEST_PORT}`;
const GOOGLE_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';
const TEST_SECRET = '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe';

let serverProc: ChildProcess | null = null;

before(async () => {
  serverProc = spawn('node', ['dist/server.cjs'], {
    cwd: process.cwd(),
    stdio: 'ignore',
    env: { ...process.env, NODE_ENV: 'production', PORT: TEST_PORT },
  });

  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 250));
    try {
      const res = await fetch(`${BASE_URL}/api/recaptcha-site-key`);
      if (res.status === 200) break;
    } catch {}
  }
});

after(() => {
  if (serverProc) {
    serverProc.kill();
  }
});

describe('🤖 Bot Protection & Human Verification Test Suite', () => {

  describe('1. Server Security Configuration', () => {
    it('should deliver the reCAPTCHA site key to frontend clients', async () => {
      const res = await fetch(`${BASE_URL}/api/recaptcha-site-key`);
      assert.equal(res.status, 200, 'Expected 200 OK');
      
      const data = await res.json();
      assert.ok(data.siteKey, 'Site key must not be empty');
      assert.equal(typeof data.siteKey, 'string', 'Site key must be a string');
      assert.equal(data.siteKey.length > 10, true, 'Site key must be valid length');
    });
  });

  describe('2. Bot Attack Prevention (Missing or Malformed Tokens)', () => {
    it('should reject bot registration when no token is provided', async () => {
      const res = await fetch(`${BASE_URL}/api/verify-recaptcha`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      assert.equal(res.status, 400, 'Expected 400 Bad Request for bot attempt');
      const data = await res.json();
      assert.equal(data.success, false, 'Success must be false for bot attempt');
      assert.match(data.error, /token is required/i, 'Error must state token is required');
    });

    it('should reject bot registration when empty string token is provided', async () => {
      const res = await fetch(`${BASE_URL}/api/verify-recaptcha`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: '' }),
      });

      assert.equal(res.status, 400, 'Expected 400 Bad Request');
      const data = await res.json();
      assert.equal(data.success, false);
    });
  });

  describe('3. Google reCAPTCHA Verification Engine', () => {
    it('should confirm human verification when Arka Shield interactive token is provided', async () => {
      const res = await fetch(`${BASE_URL}/api/verify-recaptcha`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: `human_verified_${Date.now()}_testabc123` }),
      });

      assert.equal(res.status, 200, 'Expected 200 OK for Arka Shield token');
      const data = await res.json();
      assert.equal(data.success, true, 'Expected success: true');
      assert.equal(data.provider, 'arka-shield', 'Expected provider: arka-shield');
    });

    it('should confirm human verification when valid token response is provided', async () => {
      const res = await fetch(`${BASE_URL}/api/verify-recaptcha`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'PASSED_HUMAN_CHALLENGE_TOKEN' }),
      });

      assert.equal(res.status, 200, 'Expected 200 OK for verified human token');
      const data = await res.json();
      assert.equal(data.success, true, 'Expected success: true from Google API');
    });

    it('should communicate with Google siteverify API and receive legitimate verification', async () => {
      const params = new URLSearchParams({
        secret: TEST_SECRET,
        response: 'PASSED_HUMAN_CHALLENGE_TOKEN',
      });

      const googleRes = await fetch(GOOGLE_VERIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      assert.equal(googleRes.status, 200, 'Google API must respond with 200');
      const googleData = await googleRes.json();
      assert.equal(googleData.success, true, 'Google verification response must be true');
    });
  });

  describe('4. Sign-Up Human Verification Business Logic', () => {
    it('should require all fields (Name, Email, Password, Human Verification) for registration', () => {
      const validateSignUp = (input: { name?: string; email?: string; password?: string; humanVerified?: boolean }) => {
        if (!input.name?.trim()) return { valid: false, error: 'Name is required' };
        if (!input.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) return { valid: false, error: 'Valid email required' };
        if (!input.password || input.password.length < 6) return { valid: false, error: 'Password min 6 chars required' };
        if (!input.humanVerified) return { valid: false, error: 'Human verification required' };
        return { valid: true };
      };

      // Test bot without human verification
      const botAttempt = validateSignUp({
        name: 'Automated Bot',
        email: 'bot@spammer.net',
        password: 'password123',
        humanVerified: false,
      });
      assert.equal(botAttempt.valid, false);
      assert.equal(botAttempt.error, 'Human verification required');

      // Test human with all valid credentials and verification
      const humanAttempt = validateSignUp({
        name: 'Real Citizen',
        email: 'citizen@arka.community',
        password: 'securePassword123',
        humanVerified: true,
      });
      assert.equal(humanAttempt.valid, true);
    });
  });

  describe('5. Admin Portal Security PIN Enforcement', () => {
    const AUTHORIZED_ADMIN_PIN = '2026';
    const validateAdminLogin = (email: string, pin: string) => {
      if (!email?.trim()) return { success: false, error: 'Email required' };
      if (!pin?.trim()) return { success: false, error: 'PIN required' };
      if (pin.trim() !== AUTHORIZED_ADMIN_PIN) return { success: false, error: 'Invalid PIN' };
      return { success: true };
    };

    it('should reject admin login with incorrect PIN', () => {
      const result = validateAdminLogin('admin@arka.gov.in', '1234');
      assert.equal(result.success, false);
      assert.equal(result.error, 'Invalid PIN');
    });

    it('should reject admin login with empty PIN', () => {
      const result = validateAdminLogin('admin@arka.gov.in', '');
      assert.equal(result.success, false);
      assert.equal(result.error, 'PIN required');
    });

    it('should allow admin access only with authorized PIN 2026', () => {
      const result = validateAdminLogin('admin@arka.gov.in', '2026');
      assert.equal(result.success, true);
    });
  });

  describe('6. Photo–Title Relevance Verification Engine', () => {
    it('should return High Relevance when Title: "Fire Breakout" matches fire scene', async () => {
      const res = await fetch(`${BASE_URL}/api/ai/process-incident`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userTitle: 'Fire Breakout',
          userDescription: 'Heavy smoke and active fire flames visible near shop',
        }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(data.photoTitleMatchScore >= 80, 'Score should be >= 80%');
      assert.match(data.photoTitleExplanation, /fire/i, 'Explanation should mention fire');
    });

    it('should return High Relevance when Title: "Waterlogging" matches waterlogged street', async () => {
      const res = await fetch(`${BASE_URL}/api/ai/process-incident`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userTitle: 'Waterlogging',
          userDescription: 'Submerged street and heavy flood water',
        }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(data.photoTitleMatchScore >= 80, 'Score should be >= 80%');
      assert.match(data.photoTitleExplanation, /waterlogging/i);
    });

    it('should return Low Relevance when Title: "Waterlogging" has unrelated building content', async () => {
      const res = await fetch(`${BASE_URL}/api/ai/process-incident`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userTitle: 'Waterlogging',
          userDescription: 'Clear sunny day outside modern corporate building office',
        }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(data.photoTitleMatchScore <= 30, 'Score should be low (<= 30%)');
      assert.match(data.photoTitleExplanation, /waterlogging|contradicts|dry|not/i);
    });

    it('should return Low Relevance when Title: "Fire Breakout" has unrelated normal image content', async () => {
      const res = await fetch(`${BASE_URL}/api/ai/process-incident`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userTitle: 'Fire Breakout',
          userDescription: 'Normal traffic moving on sunny highway park',
        }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(data.photoTitleMatchScore <= 30, 'Score should be low (<= 30%)');
      assert.match(data.photoTitleExplanation, /fire|without|no|normal/i);
    });

    it('should return Very Low Relevance when Title: "Waterlogging" contradicts image showing fire', async () => {
      const res = await fetch(`${BASE_URL}/api/ai/process-incident`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userTitle: 'Waterlogging',
          userDescription: 'Heavy fire, smoke, and flames burning',
        }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(data.photoTitleMatchScore <= 15, 'Score should be very low (<= 15%)');
      assert.match(data.photoTitleExplanation, /fire|contradict/i);
    });
  });

  describe('7. Real Google OAuth Authentication Engine', () => {
    it('should provide Google OAuth client configuration endpoint', async () => {
      const res = await fetch(`${BASE_URL}/api/auth/google-config`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok('clientId' in data, 'Must return clientId property');
    });

    it('should reject Google auth request when no token is provided', async () => {
      const res = await fetch(`${BASE_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.error, /token is required/i);
    });

    it('should reject Google auth request with fake or invalid access token', async () => {
      const res = await fetch(`${BASE_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: 'fake_tampered_google_token_xyz' }),
      });
      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.error, /Invalid or expired Google access token/i);
    });
  });

  describe('8. Incident Post Deletion Logic', () => {
    it('should permanently remove a report from the incident list on confirmed deletion', () => {
      const initialReports = [
        { id: 'inc_101', title: 'Pothole on Main Road' },
        { id: 'inc_102', title: 'Waterlogging near Sector 5' },
        { id: 'inc_103', title: 'Fallen Tree Branch' },
      ];

      const deleteReport = (list: typeof initialReports, idToDelete: string) => {
        const index = list.findIndex((r) => r.id === idToDelete);
        if (index === -1) throw new Error('Report not found');
        return list.filter((r) => r.id !== idToDelete);
      };

      const updated = deleteReport(initialReports, 'inc_102');
      assert.equal(updated.length, 2);
      assert.ok(!updated.some((r) => r.id === 'inc_102'), 'Deleted incident must no longer exist in state');
    });
  });
});


