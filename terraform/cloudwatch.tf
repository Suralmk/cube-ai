# CloudWatch Log Group for ECS API Service
resource "aws_cloudwatch_log_group" "cube_api_logs" {
  name              = "/aws/ecs/${var.environment}-cube-ai-api"
  retention_in_days = 30

  tags = {
    Name        = "${var.environment}-cube-ai-api-logs"
    Environment = var.environment
  }
}

# CloudWatch Log Group for ECS Worker Service
resource "aws_cloudwatch_log_group" "cube_worker_logs" {
  name              = "/aws/ecs/${var.environment}-cube-ai-worker"
  retention_in_days = 30

  tags = {
    Name        = "${var.environment}-cube-ai-worker-logs"
    Environment = var.environment
  }
}
