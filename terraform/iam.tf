# ECS Task Execution Role (Pull from ECR, push logs, read secrets during startup)
resource "aws_iam_role" "ecs_execution_role" {
  name = "${var.environment}-cube-ecs-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.environment}-cube-ecs-execution-role"
    Environment = var.environment
  }
}

# Attach standard AmazonECSTaskExecutionRolePolicy
resource "aws_iam_role_policy_attachment" "ecs_execution_standard" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Allow Execution Role to fetch Secrets from Secrets Manager
resource "aws_iam_policy" "ecs_execution_secrets" {
  name        = "${var.environment}-cube-ecs-execution-secrets"
  description = "Allows ECS execution role to retrieve secrets during container startup"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [
          aws_secretsmanager_secret.cube_app_secrets.arn
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution_secrets_attach" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = aws_iam_policy.ecs_execution_secrets.arn
}

# ECS API Task Role (Runtime permissions for NestJS API)
resource "aws_iam_role" "ecs_api_task_role" {
  name = "${var.environment}-cube-ecs-api-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.environment}-cube-ecs-api-task-role"
    Environment = var.environment
  }
}

resource "aws_iam_policy" "ecs_api_task_policy" {
  name = "${var.environment}-cube-ecs-api-task-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject"
        ]
        Resource = [
          "${aws_s3_bucket.cube_ai_storage.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "sqs:GetQueueUrl"
        ]
        Resource = [
          aws_sqs_queue.cube_ingestion_queue.arn
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_api_task_attach" {
  role       = aws_iam_role.ecs_api_task_role.name
  policy_arn = aws_iam_policy.ecs_api_task_policy.arn
}

# ECS Worker Task Role (Runtime permissions for Ingestion Worker)
resource "aws_iam_role" "ecs_worker_task_role" {
  name = "${var.environment}-cube-ecs-worker-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.environment}-cube-ecs-worker-task-role"
    Environment = var.environment
  }
}

resource "aws_iam_policy" "ecs_worker_task_policy" {
  name = "${var.environment}-cube-ecs-worker-task-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject"
        ]
        Resource = [
          "${aws_s3_bucket.cube_ai_storage.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = [
          aws_sqs_queue.cube_ingestion_queue.arn
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_worker_task_attach" {
  role       = aws_iam_role.ecs_worker_task_role.name
  policy_arn = aws_iam_policy.ecs_worker_task_policy.arn
}
