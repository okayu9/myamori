# ============================================================================
# D1 Databases
# ============================================================================

resource "cloudflare_d1_database" "production" {
  account_id = var.cloudflare_account_id
  name       = "myamori-db"
}

resource "cloudflare_d1_database" "staging" {
  account_id = var.cloudflare_account_id
  name       = "myamori-db-staging"
}

# ============================================================================
# R2 Buckets
# ============================================================================

resource "cloudflare_r2_bucket" "production" {
  account_id = var.cloudflare_account_id
  name       = "myamori-files"
}

resource "cloudflare_r2_bucket" "staging" {
  account_id = var.cloudflare_account_id
  name       = "myamori-files-staging"
}

# ============================================================================
# KV Namespaces
# ============================================================================

resource "cloudflare_workers_kv_namespace" "production" {
  account_id = var.cloudflare_account_id
  title      = "myamori-rate-limit"
}

resource "cloudflare_workers_kv_namespace" "staging" {
  account_id = var.cloudflare_account_id
  title      = "myamori-rate-limit-staging"
}

# ============================================================================
# Queues
# ============================================================================

resource "cloudflare_queue" "production" {
  account_id = var.cloudflare_account_id
  queue_name = "myamori-scheduler"
}

resource "cloudflare_queue" "staging" {
  account_id = var.cloudflare_account_id
  queue_name = "myamori-scheduler-staging"
}

locals {
  create_email_resources = var.domain != "" && var.zone_id != ""
}

resource "terraform_data" "validate_email_config" {
  count = var.domain != "" && var.zone_id == "" ? 1 : 0

  lifecycle {
    precondition {
      condition     = false
      error_message = "zone_id is required when domain is set."
    }
  }
}

# ============================================================================
# DNS Records (MX for Email Workers)
# Cloudflare Email Routing requires these three MX records.
# Only created when both domain and zone_id are provided.
# ============================================================================

resource "cloudflare_dns_record" "mx_route1" {
  count    = local.create_email_resources ? 1 : 0
  zone_id  = var.zone_id
  name     = var.domain
  type     = "MX"
  content  = "route1.mx.cloudflare.net"
  priority = 12
  ttl      = 1
}

resource "cloudflare_dns_record" "mx_route2" {
  count    = local.create_email_resources ? 1 : 0
  zone_id  = var.zone_id
  name     = var.domain
  type     = "MX"
  content  = "route2.mx.cloudflare.net"
  priority = 27
  ttl      = 1
}

resource "cloudflare_dns_record" "mx_route3" {
  count    = local.create_email_resources ? 1 : 0
  zone_id  = var.zone_id
  name     = var.domain
  type     = "MX"
  content  = "route3.mx.cloudflare.net"
  priority = 69
  ttl      = 1
}

# ============================================================================
# Email Routing
# Only created when domain and zone_id are provided.
# ============================================================================

resource "cloudflare_email_routing_dns" "main" {
  count   = local.create_email_resources ? 1 : 0
  zone_id = var.zone_id
  name    = var.domain
}

resource "cloudflare_email_routing_rule" "forward_to_worker" {
  count   = local.create_email_resources ? 1 : 0
  zone_id = var.zone_id
  enabled = true
  name    = "Forward to Worker"

  matchers = [{
    type  = "all"
  }]

  actions = [{
    type  = "worker"
    value = ["myamori"]
  }]
}

# ============================================================================
# Vectorize
# ============================================================================
# Note: Cloudflare provider v5 does not have a cloudflare_vectorize_index
# resource. Vectorize indexes must be created manually:
#   bunx wrangler vectorize create myamori-memory --dimensions 768 --metric cosine
#   bunx wrangler vectorize create myamori-memory-staging --dimensions 768 --metric cosine
