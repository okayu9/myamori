## 1. Workflow File

- [x] 1.1 Create `.github/workflows/archive.yml` with trigger on push to `main`
- [x] 1.2 Add step to check for unarchived changes and exit early if none
- [x] 1.3 Add step to run `npx openspec@1 archive`
- [x] 1.4 Add success path: create PR with `gh pr create`, enable auto-merge with `gh pr merge --auto --squash`
- [x] 1.5 Add failure path: commit changes, create Draft PR with warning in body

## 2. Verification

- [x] 2.1 Verify workflow YAML is valid (`actionlint` or manual review)
- [x] 2.2 Verify workflow permissions (`contents: write`, `pull-requests: write`) are set
