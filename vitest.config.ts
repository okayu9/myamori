import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
	test: {
		poolOptions: {
			workers: {
				wrangler: { configPath: "./wrangler.toml" },
				miniflare: {
					bindings: {
						TELEGRAM_BOT_TOKEN: "test-bot-token",
						TELEGRAM_WEBHOOK_SECRET: "test-webhook-secret",
					},
				},
			},
		},
	},
});
