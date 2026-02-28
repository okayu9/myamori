declare module "cloudflare:test" {
	interface ProvidedEnv {
		DB: D1Database;
		TEST_MIGRATIONS: D1Migration[];
		TELEGRAM_BOT_TOKEN: string;
		TELEGRAM_WEBHOOK_SECRET: string;
		ALLOWED_USER_IDS: string;
		ANTHROPIC_API_KEY: string;
		ANTHROPIC_MODEL: string;
	}
}
