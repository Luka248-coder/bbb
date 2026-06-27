export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export const VERIFICATION_CODE_TTL_MS = 10 * 60 * 1000 // 10 minutes
export const MAX_VERIFICATION_ATTEMPTS = 5
