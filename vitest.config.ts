import path from "node:path";
import {
	defineWorkersConfig,
	readD1Migrations,
} from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig(async () => {
	const migrationsPath = path.join(__dirname, "drizzle", "migrations");
	const migrations = await readD1Migrations(migrationsPath);

	return {
		test: {
			setupFiles: ["./test/apply-migrations.ts"],
			poolOptions: {
				workers: {
					wrangler: { configPath: "./wrangler.toml" },
					miniflare: {
						bindings: {
							TELEGRAM_BOT_TOKEN: "test-bot-token",
							TELEGRAM_WEBHOOK_SECRET: "test-webhook-secret",
							ALLOWED_USER_IDS: "42",
							ANTHROPIC_API_KEY: "test-api-key",
							ANTHROPIC_MODEL: "claude-haiku-4-5",
							TAVILY_API_KEY: "test-tavily-key",
							TEST_MIGRATIONS: migrations,
						},
						d1Databases: ["DB"],
					},
				},
			},
		},
	};
});
