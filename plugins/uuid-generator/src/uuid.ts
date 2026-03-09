// UUID generation for all standard versions
// No external dependencies — uses Web Crypto API

const HEX = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0"));

function randomBytes(n: number): Uint8Array {
	const buf = new Uint8Array(n);
	crypto.getRandomValues(buf);
	return buf;
}

function formatUuid(bytes: Uint8Array): string {
	return (
		HEX[bytes[0]] + HEX[bytes[1]] + HEX[bytes[2]] + HEX[bytes[3]] + "-" +
		HEX[bytes[4]] + HEX[bytes[5]] + "-" +
		HEX[bytes[6]] + HEX[bytes[7]] + "-" +
		HEX[bytes[8]] + HEX[bytes[9]] + "-" +
		HEX[bytes[10]] + HEX[bytes[11]] + HEX[bytes[12]] + HEX[bytes[13]] + HEX[bytes[14]] + HEX[bytes[15]]
	);
}

// ─── v1: Time-based ────────────────────────────────────────
// Uses 100ns intervals since 1582-10-15 + random clock_seq + random node

// Offset between Unix epoch (1970) and UUID epoch (1582) in milliseconds
const UUID_EPOCH_OFFSET = 122192928000000000n; // in 100ns units

let v1ClockSeq = (randomBytes(2)[0] << 8 | randomBytes(2)[1]) & 0x3fff;
let v1LastTimestamp = 0n;
let v1Counter = 0;
const v1Node = randomBytes(6);
// Set multicast bit to indicate random node (RFC 4122 §4.5)
v1Node[0] = v1Node[0] | 0x01;

export function uuidV1(): string {
	// 100ns intervals since UUID epoch
	let timestamp = BigInt(Date.now()) * 10000n + UUID_EPOCH_OFFSET;

	// If same millisecond, increment sub-ms counter
	if (timestamp <= v1LastTimestamp) {
		v1Counter++;
		timestamp = v1LastTimestamp + BigInt(v1Counter);
	} else {
		v1Counter = 0;
		v1LastTimestamp = timestamp;
	}

	const timeLow = Number(timestamp & 0xffffffffn);
	const timeMid = Number((timestamp >> 32n) & 0xffffn);
	const timeHi = Number((timestamp >> 48n) & 0x0fffn) | 0x1000; // version 1

	const bytes = new Uint8Array(16);
	// time_low (big-endian)
	bytes[0] = (timeLow >>> 24) & 0xff;
	bytes[1] = (timeLow >>> 16) & 0xff;
	bytes[2] = (timeLow >>> 8) & 0xff;
	bytes[3] = timeLow & 0xff;
	// time_mid
	bytes[4] = (timeMid >>> 8) & 0xff;
	bytes[5] = timeMid & 0xff;
	// time_hi_and_version
	bytes[6] = (timeHi >>> 8) & 0xff;
	bytes[7] = timeHi & 0xff;
	// clock_seq_hi_and_variant
	bytes[8] = ((v1ClockSeq >>> 8) & 0x3f) | 0x80; // variant 10xx
	bytes[9] = v1ClockSeq & 0xff;
	// node
	bytes.set(v1Node, 10);

	return formatUuid(bytes);
}

// ─── v4: Random ────────────────────────────────────────────

export function uuidV4(): string {
	const bytes = randomBytes(16);
	bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
	bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10xx
	return formatUuid(bytes);
}

// ─── v5: Name-based (SHA-1) ────────────────────────────────

// Predefined namespaces (RFC 4122)
export const NAMESPACES = {
	DNS:  "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
	URL:  "6ba7b811-9dad-11d1-80b4-00c04fd430c8",
	OID:  "6ba7b812-9dad-11d1-80b4-00c04fd430c8",
	X500: "6ba7b814-9dad-11d1-80b4-00c04fd430c8",
} as const;

function parseUuidToBytes(uuid: string): Uint8Array {
	const hex = uuid.replace(/-/g, "");
	const bytes = new Uint8Array(16);
	for (let i = 0; i < 16; i++) {
		bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
	}
	return bytes;
}

export async function uuidV5(namespace: string, name: string): Promise<string> {
	const nsBytes = parseUuidToBytes(namespace);
	const nameBytes = new TextEncoder().encode(name);

	const data = new Uint8Array(nsBytes.length + nameBytes.length);
	data.set(nsBytes);
	data.set(nameBytes, nsBytes.length);

	const hashBuffer = await crypto.subtle.digest("SHA-1", data);
	const bytes = new Uint8Array(hashBuffer).slice(0, 16);

	bytes[6] = (bytes[6] & 0x0f) | 0x50; // version 5
	bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10xx

	return formatUuid(bytes);
}

// ─── v7: Unix Epoch time-based (sortable) ──────────────────

export function uuidV7(): string {
	const now = BigInt(Date.now());
	const bytes = randomBytes(16);

	// First 48 bits: unix_ts_ms (big-endian)
	bytes[0] = Number((now >> 40n) & 0xffn);
	bytes[1] = Number((now >> 32n) & 0xffn);
	bytes[2] = Number((now >> 24n) & 0xffn);
	bytes[3] = Number((now >> 16n) & 0xffn);
	bytes[4] = Number((now >> 8n) & 0xffn);
	bytes[5] = Number(now & 0xffn);

	// Version 7
	bytes[6] = (bytes[6] & 0x0f) | 0x70;
	// Variant 10xx
	bytes[8] = (bytes[8] & 0x3f) | 0x80;

	return formatUuid(bytes);
}

// ─── Nil & Max ─────────────────────────────────────────────

export function uuidNil(): string {
	return "00000000-0000-0000-0000-000000000000";
}

export function uuidMax(): string {
	return "ffffffff-ffff-ffff-ffff-ffffffffffff";
}

// ─── Batch generation ──────────────────────────────────────

export type UuidVersion = "v1" | "v4" | "v5" | "v7" | "nil" | "max";

export interface GenerateOptions {
	version: UuidVersion;
	count: number;
	// v5-specific
	namespace?: string;
	name?: string;
}

export async function generateUuids(opts: GenerateOptions): Promise<string[]> {
	const results: string[] = [];
	for (let i = 0; i < opts.count; i++) {
		switch (opts.version) {
			case "v1":
				results.push(uuidV1());
				break;
			case "v4":
				results.push(uuidV4());
				break;
			case "v5":
				results.push(await uuidV5(opts.namespace || NAMESPACES.DNS, opts.name || ""));
				break;
			case "v7":
				results.push(uuidV7());
				break;
			case "nil":
				results.push(uuidNil());
				break;
			case "max":
				results.push(uuidMax());
				break;
		}
	}
	return results;
}
