# Dead Letter Queue for failed document indexing jobs
resource "aws_sqs_queue" "cube_ingestion_dlq" {
  name                      = "${var.environment}-cube-document-ingestion-dlq"
  message_retention_seconds = 1209600 # 14 days

  tags = {
    Name        = "${var.environment}-cube-document-ingestion-dlq"
    Environment = var.environment
  }
}

# Main SQS Queue for asynchronous document processing
resource "aws_sqs_queue" "cube_ingestion_queue" {
  name                       = "${var.environment}-cube-document-ingestion-queue"
  visibility_timeout_seconds = 300   # 5 minutes for PDF parsing & embedding generation
  message_retention_seconds  = 86400 # 1 day

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.cube_ingestion_dlq.arn
    maxReceiveCount     = 3
  })

  tags = {
    Name        = "${var.environment}-cube-document-ingestion-queue"
    Environment = var.environment
  }
}
