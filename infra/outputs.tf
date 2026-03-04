# ============================================================================
# Production outputs (for GitHub Environment: production)
# ============================================================================

output "d1_database_name" {
  description = "Production D1 database name"
  value       = cloudflare_d1_database.production.name
}

output "d1_database_id" {
  description = "Production D1 database ID"
  value       = cloudflare_d1_database.production.id
}

output "r2_bucket_name" {
  description = "Production R2 bucket name"
  value       = cloudflare_r2_bucket.production.name
}

output "kv_namespace_id" {
  description = "Production KV namespace ID"
  value       = cloudflare_workers_kv_namespace.production.id
}

output "queue_name" {
  description = "Production queue name"
  value       = cloudflare_queue.production.queue_name
}

# ============================================================================
# Staging outputs (for GitHub Environment: staging)
# ============================================================================

output "staging_d1_database_name" {
  description = "Staging D1 database name"
  value       = cloudflare_d1_database.staging.name
}

output "staging_d1_database_id" {
  description = "Staging D1 database ID"
  value       = cloudflare_d1_database.staging.id
}

output "staging_r2_bucket_name" {
  description = "Staging R2 bucket name"
  value       = cloudflare_r2_bucket.staging.name
}

output "staging_kv_namespace_id" {
  description = "Staging KV namespace ID"
  value       = cloudflare_workers_kv_namespace.staging.id
}

output "staging_queue_name" {
  description = "Staging queue name"
  value       = cloudflare_queue.staging.queue_name
}
