# AWS Secrets Manager Secret for Application Credentials
resource "aws_secretsmanager_secret" "cube_app_secrets" {
  name                    = "${var.environment}/cube-ai/secrets"
  recovery_window_in_days = 0 # Immediate deletion on destroy for dev/testing

  tags = {
    Name        = "${var.environment}-cube-ai-secrets"
    Environment = var.environment
  }
}

# Initial placeholder secret version structure
resource "aws_secretsmanager_secret_version" "cube_app_secrets_val" {
  secret_id = aws_secretsmanager_secret.cube_app_secrets.id
  secret_string = jsonencode({
    DATABASE_URL       = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.cube_postgres.endpoint}/${var.db_name}?sslmode=require"
    BETTER_AUTH_SECRET = "change-me-to-a-secure-random-32-character-secret"
    OPENROUTER_API_KEY = "your-openrouter-api-key"
    QDRANT_API_KEY     = ""
  })
}
