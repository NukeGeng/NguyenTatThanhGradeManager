const TEN_DIGITS = 10;

function hashSeedToTenDigits(seed: string): string {
  if (!seed) {
    return '0000000000';
  }

  let hashA = 0;
  let hashB = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    const code = seed.charCodeAt(index);
    hashA = (hashA * 31 + code) >>> 0;
    hashB ^= code;
    hashB = Math.imul(hashB, 16777619) >>> 0;
  }

  const digits = `${hashA}${hashB}`.replace(/\D/g, '');
  return digits.slice(0, TEN_DIGITS).padStart(TEN_DIGITS, '0');
}

export function toTenDigitCode(
  value: string | number | null | undefined,
  fallbackSeed = '',
): string {
  const rawValue = value === null || value === undefined ? '' : String(value);
  const digits = rawValue.replace(/\D/g, '');

  if (digits.length >= TEN_DIGITS) {
    return digits.slice(-TEN_DIGITS);
  }

  if (digits.length > 0) {
    return digits.padStart(TEN_DIGITS, '0');
  }

  return hashSeedToTenDigits(fallbackSeed || rawValue || '0');
}

export function toTenDigitStudentCode(
  studentCode: string | null | undefined,
  studentId = '',
): string {
  return toTenDigitCode(studentCode, `STU-${studentId}`);
}

export function toTenDigitTeacherCode(userId: string, teacherCode?: string | null): string {
  return toTenDigitCode(teacherCode, `TEA-${userId}`);
}
