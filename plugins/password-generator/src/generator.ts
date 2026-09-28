// Core generation logic. All randomness goes through crypto.getRandomValues —
// never Math.random — since this plugin exists specifically to produce
// secrets.

const LOWER = "abcdefghijklmnopqrstuvwxyz";
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";
const SYMBOLS = "!@#$%^&*()-_=+[]{};:,.<>?";
// Characters that are easy to misread in most fonts: 0/O, 1/l/I, etc.
const AMBIGUOUS = "0O1lI|";

function randomInt(maxExclusive: number): number {
	// Rejection sampling over the full 32-bit space, so the result stays
	// uniform for any maxExclusive — including values above 256 (e.g. the
	// 1400+ entry wordlist), which a single random byte can't cover. A
	// single byte's modulo range silently degenerates to an infinite loop
	// once maxExclusive > 256 (256 % maxExclusive == 256, so range hits 0).
	const range = Math.floor(0x100000000 / maxExclusive) * maxExclusive;
	const buf = new Uint32Array(1);
	let x: number;
	do {
		crypto.getRandomValues(buf);
		x = buf[0];
	} while (x >= range);
	return x % maxExclusive;
}

function randomChar(charset: string): string {
	return charset[randomInt(charset.length)];
}

function shuffle<T>(arr: T[]): T[] {
	const a = arr.slice();
	for (let i = a.length - 1; i > 0; i--) {
		const j = randomInt(i + 1);
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

export interface PasswordOptions {
	length: number;
	lower: boolean;
	upper: boolean;
	digits: boolean;
	symbols: boolean;
	excludeAmbiguous: boolean;
}

export function generatePassword(opts: PasswordOptions): string {
	let pools = [
		opts.lower ? LOWER : "",
		opts.upper ? UPPER : "",
		opts.digits ? DIGITS : "",
		opts.symbols ? SYMBOLS : "",
	].filter(p => p.length > 0);

	if (opts.excludeAmbiguous) {
		pools = pools.map(p => [...p].filter(c => !AMBIGUOUS.includes(c)).join(""));
	}

	if (pools.length === 0) return "";

	const full = pools.join("");
	const length = Math.max(1, opts.length);

	// Guarantee at least one char from every selected pool (when length allows),
	// then fill the rest from the combined pool, then shuffle so the
	// guaranteed picks aren't always in the same position.
	const guaranteed = pools.slice(0, length).map(randomChar);
	const rest = Array.from({ length: Math.max(0, length - guaranteed.length) }, () => randomChar(full));
	return shuffle([...guaranteed, ...rest]).join("");
}

export interface PassphraseOptions {
	wordCount: number;
	separator: string;
	capitalize: boolean;
	includeNumber: boolean;
}

export function generatePassphrase(opts: PassphraseOptions, wordlist: string[]): string {
	const count = Math.max(1, opts.wordCount);
	const words = Array.from({ length: count }, () => {
		const w = wordlist[randomInt(wordlist.length)];
		return opts.capitalize ? w[0].toUpperCase() + w.slice(1) : w;
	});
	if (opts.includeNumber) {
		words.push(String(randomInt(100)).padStart(2, "0"));
	}
	return words.join(opts.separator);
}

export interface ApiKeyOptions {
	prefix: string;
	length: number;
}

const BASE62 = LOWER + UPPER + DIGITS;

export function generateApiKey(opts: ApiKeyOptions): string {
	const body = Array.from({ length: Math.max(1, opts.length) }, () => randomChar(BASE62)).join("");
	const prefix = opts.prefix.trim();
	return prefix ? `${prefix}${prefix.endsWith("_") ? "" : "_"}${body}` : body;
}

export type StrengthLabel = "Very weak" | "Weak" | "Fair" | "Good" | "Strong" | "Very strong";

export interface Strength {
	bits: number;
	label: StrengthLabel;
	// 0..1, for a meter bar
	score: number;
}

/** Shannon-style entropy estimate from the actual character-class pool size used. */
export function estimateStrength(value: string): Strength {
	if (!value) return { bits: 0, label: "Very weak", score: 0 };

	let poolSize = 0;
	if (/[a-z]/.test(value)) poolSize += LOWER.length;
	if (/[A-Z]/.test(value)) poolSize += UPPER.length;
	if (/[0-9]/.test(value)) poolSize += DIGITS.length;
	if (/[^a-zA-Z0-9]/.test(value)) poolSize += SYMBOLS.length;
	if (poolSize === 0) poolSize = 26;

	const bits = Math.round(value.length * Math.log2(poolSize));

	let label: StrengthLabel;
	let score: number;
	if (bits < 28) { label = "Very weak"; score = 0.15; }
	else if (bits < 36) { label = "Weak"; score = 0.35; }
	else if (bits < 50) { label = "Fair"; score = 0.55; }
	else if (bits < 65) { label = "Good"; score = 0.75; }
	else if (bits < 80) { label = "Strong"; score = 0.9; }
	else { label = "Very strong"; score = 1; }

	return { bits, label, score };
}
