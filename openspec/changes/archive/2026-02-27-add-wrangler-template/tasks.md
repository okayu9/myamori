## 1. Template File

- [x] 1.1 Create `wrangler.toml.template` with `${PLACEHOLDER}` variables for production and `[env.staging]` sections, including D1, R2, and Discord vars
- [x] 1.2 Verify all `${...}` placeholders follow valid shell variable naming (`[A-Z_]+`)

## 2. Git Configuration

- [x] 2.1 Add `wrangler.toml` to `.gitignore`
- [x] 2.2 Verify `wrangler.toml.template` is NOT ignored (tracked by git)
