// Pure client-side password utilities. Nothing is logged or persisted.

const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWER = "abcdefghijklmnopqrstuvwxyz";
const NUMS = "0123456789";
const SYMS = "!@#$%^&*()-_=+[]{};:,.<>/?~";
const SIMILAR = /[O0o1lI|`'"]/g;

export interface GenOpts {
  length: number;
  upper: boolean;
  lower: boolean;
  numbers: boolean;
  symbols: boolean;
  excludeSimilar: boolean;
}

export function generatePassword(opts: GenOpts): string {
  let pool = "";
  const buckets: string[] = [];
  if (opts.upper) { pool += UPPER; buckets.push(UPPER); }
  if (opts.lower) { pool += LOWER; buckets.push(LOWER); }
  if (opts.numbers) { pool += NUMS; buckets.push(NUMS); }
  if (opts.symbols) { pool += SYMS; buckets.push(SYMS); }
  if (opts.excludeSimilar) {
    pool = pool.replace(SIMILAR, "");
  }
  if (!pool) return "";
  const len = Math.max(4, Math.min(50, opts.length));
  const out: string[] = [];
  const rand = new Uint32Array(len);
  crypto.getRandomValues(rand);
  for (let i = 0; i < len; i++) out.push(pool[rand[i] % pool.length]);
  // ensure at least one of each selected bucket
  for (let i = 0; i < buckets.length && i < len; i++) {
    let b = buckets[i];
    if (opts.excludeSimilar) b = b.replace(SIMILAR, "");
    if (!b) continue;
    const r = new Uint32Array(2);
    crypto.getRandomValues(r);
    out[r[0] % len] = b[r[1] % b.length];
  }
  return out.join("");
}

const COMMON = new Set([
  "password","123456","123456789","qwerty","abc123","password1","111111","iloveyou",
  "admin","welcome","monkey","letmein","dragon","sunshine","princess","qwerty123",
  "1q2w3e4r","passw0rd","football","baseball","master","hello","freedom","whatever",
  "123123","trustno1","000000","654321","superman","batman","starwars",
]);

export interface StrengthResult {
  score: number; // 0-100
  level: "Very Weak" | "Weak" | "Medium" | "Strong" | "Very Strong";
  crackTime: string;
  entropyBits: number;
  feedback: string[];
  checks: {
    length: boolean;
    upper: boolean;
    lower: boolean;
    number: boolean;
    symbol: boolean;
    noRepeats: boolean;
    noSequence: boolean;
    notCommon: boolean;
  };
}

function hasSequence(pw: string): boolean {
  const lower = pw.toLowerCase();
  for (let i = 0; i < lower.length - 2; i++) {
    const a = lower.charCodeAt(i), b = lower.charCodeAt(i + 1), c = lower.charCodeAt(i + 2);
    if (b - a === 1 && c - b === 1) return true;
    if (a - b === 1 && b - c === 1) return true;
  }
  return false;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds > 1e18) return "centuries";
  if (seconds < 1) return "instant";
  const u: [number, string][] = [
    [60, "seconds"], [60, "minutes"], [24, "hours"], [365, "days"], [100, "years"], [10, "centuries"],
  ];
  let v = seconds; let label = "seconds";
  for (const [div, name] of u) {
    if (v < div) { label = name; break; }
    v /= div; label = name;
  }
  return `${v < 10 ? v.toFixed(1) : Math.round(v)} ${label}`;
}

export function checkStrength(pw: string): StrengthResult {
  const checks = {
    length: pw.length >= 12,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    number: /\d/.test(pw),
    symbol: /[^A-Za-z0-9]/.test(pw),
    noRepeats: !/(.)\1{2,}/.test(pw),
    noSequence: !hasSequence(pw),
    notCommon: !COMMON.has(pw.toLowerCase()),
  };

  let poolSize = 0;
  if (/[a-z]/.test(pw)) poolSize += 26;
  if (/[A-Z]/.test(pw)) poolSize += 26;
  if (/\d/.test(pw)) poolSize += 10;
  if (/[^A-Za-z0-9]/.test(pw)) poolSize += 32;
  const entropyBits = pw.length > 0 && poolSize > 0 ? pw.length * Math.log2(poolSize) : 0;

  let score = 0;
  if (pw.length >= 8) score += 15;
  if (pw.length >= 12) score += 15;
  if (pw.length >= 16) score += 10;
  if (checks.upper) score += 8;
  if (checks.lower) score += 8;
  if (checks.number) score += 8;
  if (checks.symbol) score += 12;
  if (checks.noRepeats) score += 8;
  if (checks.noSequence) score += 8;
  if (checks.notCommon) score += 8;
  score = Math.min(100, Math.max(0, score));
  if (!pw) score = 0;

  let level: StrengthResult["level"] = "Very Weak";
  if (score >= 85) level = "Very Strong";
  else if (score >= 65) level = "Strong";
  else if (score >= 45) level = "Medium";
  else if (score >= 25) level = "Weak";

  // 10 billion guesses/sec (offline attack)
  const guesses = Math.pow(2, entropyBits);
  const crackTime = formatTime(guesses / 1e10);

  const feedback: string[] = [];
  if (!checks.length) feedback.push("Use at least 12 characters.");
  if (!checks.upper) feedback.push("Add uppercase letters.");
  if (!checks.lower) feedback.push("Add lowercase letters.");
  if (!checks.number) feedback.push("Add numbers.");
  if (!checks.symbol) feedback.push("Add symbols (e.g. !@#$).");
  if (!checks.noRepeats) feedback.push("Avoid 3+ repeated characters.");
  if (!checks.noSequence) feedback.push("Avoid sequential patterns (abc, 123).");
  if (!checks.notCommon) feedback.push("This is a commonly used password.");

  return { score, level, crackTime, entropyBits, feedback, checks };
}
