declare module "cloudflare:test" {
	interface ProvidedEnv {
		DB: D1Database;
		TEST_MIGRATIONS: D1Migration[];
		TELEGRAM_BOT_TOKEN: string;
		TELEGRAM_WEBHOOK_SECRET: string;
		ALLOWED_USER_IDS: string;
		ANTHROPIC_API_KEY: string;
		ANTHROPIC_MODEL: string;
		TAVILY_API_KEY: string;
		RATE_LIMIT_KV: KVNamespace;
		FILE_BUCKET: R2Bucket;
	}
}
