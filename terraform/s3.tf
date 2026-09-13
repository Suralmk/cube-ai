resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# S3 Bucket for persistent document storage
resource "aws_s3_bucket" "cube_ai_storage" {
  bucket = "${var.environment}-cube-ai-storage-${random_id.bucket_suffix.hex}"

  tags = {
    Name        = "${var.environment}-cube-ai-storage"
    Environment = var.environment
  }
}

# Block all public access to S3 bucket
resource "aws_s3_bucket_public_access_block" "cube_ai_storage" {
  bucket = aws_s3_bucket.cube_ai_storage.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Enable Server-Side Encryption (SSE-S3)
resource "aws_s3_bucket_server_side_encryption_configuration" "cube_ai_storage" {
  bucket = aws_s3_bucket.cube_ai_storage.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Enable Versioning for document revision safety
resource "aws_s3_bucket_versioning" "cube_ai_storage" {
  bucket = aws_s3_bucket.cube_ai_storage.id

  versioning_configuration {
    status = "Enabled"
  }
}
