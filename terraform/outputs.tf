output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = aws_lb.cube_alb.dns_name
}

output "s3_bucket_name" {
  description = "Name of the S3 storage bucket"
  value       = aws_s3_bucket.cube_ai_storage.id
}

output "rds_endpoint" {
  description = "Connection endpoint for Amazon RDS PostgreSQL"
  value       = aws_db_instance.cube_postgres.endpoint
}

output "ecr_api_repository_url" {
  description = "ECR Repository URL for the API image"
  value       = aws_ecr_repository.cube_api.repository_url
}

output "ecr_worker_repository_url" {
  description = "ECR Repository URL for the Worker image"
  value       = aws_ecr_repository.cube_worker.repository_url
}

output "sqs_queue_url" {
  description = "URL of the SQS document ingestion queue"
  value       = aws_sqs_queue.cube_ingestion_queue.url
}
