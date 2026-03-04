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

  validation {
    condition     = can(regex("^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)+$", var.domain))
    error_message = "Must be a valid domain name (e.g., example.com)."
  }
}

variable "zone_id" {
  description = "Cloudflare zone ID for the domain"
  type        = string
}

variable "email_forward_to" {
  description = "Email address to forward incoming emails to the Worker"
  type        = string
  default     = ""

  validation {
    condition     = var.email_forward_to == "" || can(regex("^[^@]+@[^@]+\\.[^@]+$", var.email_forward_to))
    error_message = "Must be a valid email address or empty string."
  }
}
