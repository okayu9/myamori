variable "cloudflare_api_token" {
  description = "Cloudflare API token with permissions for D1, R2, KV, Queues, DNS, and Email Routing"
  type        = string
  sensitive   = true
}

variable "cloudflare_account_id" {
  description = "Cloudflare account ID"
  type        = string
}

variable "domain" {
  description = "Domain name for DNS records and Email Routing (e.g., example.com)"
  type        = string
}

variable "zone_id" {
  description = "Cloudflare zone ID for the domain"
  type        = string
}

variable "email_forward_to" {
  description = "Email address to forward incoming emails to the Worker"
  type        = string
  default     = ""
}
