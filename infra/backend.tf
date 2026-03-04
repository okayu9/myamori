terraform {
  backend "s3" {
    bucket = "myamori-tofu-state"
    key    = "terraform.tfstate"
    region = "auto"

    # R2 S3-compatible API settings
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_s3_checksum            = true

    # Endpoint is configured via environment variable or -backend-config:
    #   export AWS_ENDPOINT_URL_S3="https://<account_id>.r2.cloudflarestorage.com"
    # or:
    #   tofu init -backend-config="endpoints={s3=\"https://<account_id>.r2.cloudflarestorage.com\"}"
  }
}
