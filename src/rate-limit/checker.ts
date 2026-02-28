export interface RateLimitResult {
	allowed: boolean;
	remaining: number;
}

export async function checkRateLimit(
	kv: KVNamespace,
	userId: string,
	max: number,
	windowMs: number,
): Promise<RateLimitResult> {
	const windowKey = Math.floor(Date.now() / windowMs);
	const key = `ratelimit:${userId}:${windowKey}`;

	const current = await kv.get(key);
	const count = current ? Number.parseInt(current, 10) || 0 : 0;

	if (count >= max) {
		return { allowed: false, remaining: 0 };
	}

	const newCount = count + 1;
	const ttlSeconds = Math.max(60, Math.ceil(windowMs / 1000));
	await kv.put(key, String(newCount), { expirationTtl: ttlSeconds });

	return { allowed: true, remaining: max - newCount };
}
