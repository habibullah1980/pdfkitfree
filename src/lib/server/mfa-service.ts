import crypto from 'crypto';

/**
 * Base32 decode for RFC 6238 TOTP secrets
 */
function base32Decode(input: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (let i = 0; i < input.length; i++) {
    const char = input[i].toUpperCase();
    if (char === '=' || char === ' ') continue;
    const index = alphabet.indexOf(char);
    if (index === -1) continue;

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(output);
}

/**
 * Base32 encode buffer to string
 */
function base32Encode(buffer: Buffer): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31];
  }

  return output;
}

export class MfaService {
  /**
   * Generates a new Base32 TOTP secret and recovery codes
   */
  static generateSecret(email: string): { secret: string; otpauthUrl: string; recoveryCodes: string[] } {
    const secretBuf = crypto.randomBytes(20);
    const secret = base32Encode(secretBuf);

    const issuer = 'pdfkitfree';
    const encodedIssuer = encodeURIComponent(issuer);
    const encodedEmail = encodeURIComponent(email);
    const otpauthUrl = `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;

    // Generate 8 10-character recovery codes
    const recoveryCodes: string[] = [];
    for (let i = 0; i < 8; i++) {
      recoveryCodes.push(crypto.randomBytes(5).toString('hex').toUpperCase());
    }

    return { secret, otpauthUrl, recoveryCodes };
  }

  /**
   * Computes the current TOTP token for verification or tests
   */
  static generateToken(secret: string, offsetSteps = 0): string {
    const secretBuf = base32Decode(secret);
    const currentStep = Math.floor(Date.now() / 1000 / 30) + offsetSteps;

    const buf = Buffer.alloc(8);
    buf.writeBigInt64BE(BigInt(currentStep));

    const hmac = crypto.createHmac('sha1', secretBuf).update(buf).digest();
    const offset = hmac[hmac.length - 1] & 0xf;
    const code = ((hmac.readUInt32BE(offset) & 0x7fffffff) % 1000000).toString().padStart(6, '0');

    return code;
  }

  /**
   * Validates a TOTP 6-digit code against a secret with +/- 1 step window drift
   */
  static verifyToken(secret: string, token: string, window = 1): boolean {
    const cleanToken = token.trim();
    if (!/^\d{6}$/.test(cleanToken)) return false;

    for (let offset = -window; offset <= window; offset++) {
      if (this.generateToken(secret, offset) === cleanToken) {
        return true;
      }
    }

    return false;
  }
}
