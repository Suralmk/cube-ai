# ECS Cluster
resource "aws_ecs_cluster" "cube_cluster" {
  name = "${var.environment}-cube-ai-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name        = "${var.environment}-cube-ai-cluster"
    Environment = var.environment
  }
}

# ECS Task Definition for NestJS API
resource "aws_ecs_task_definition" "cube_api_task" {
  family                   = "${var.environment}-cube-ai-api"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "1024" # 1 vCPU
  memory                   = "2048" # 2 GB
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_api_task_role.arn

  container_definitions = jsonencode([
    {
      name      = "cube-ai-api"
      image     = "${aws_ecr_repository.cube_api.repository_url}:latest"
      essential = true
      stopTimeout = 60

      portMappings = [
        {
          containerPort = 8000
          hostPort      = 8000
          protocol      = "tcp"
        }
      ]

      environment = [
        { name = "NODE_ENV", value = "production" },
        { name = "PORT", value = "8000" },
        { name = "API_PREFIX", value = "api/v1" },
        { name = "STORAGE_DRIVER", value = "s3" },
        { name = "AWS_REGION", value = var.aws_region },
        { name = "AWS_S3_BUCKET_NAME", value = aws_s3_bucket.cube_ai_storage.id },
        { name = "SQS_QUEUE_URL", value = aws_sqs_queue.cube_ingestion_queue.url }
      ]

      secrets = [
        {
          name      = "DATABASE_URL"
          valueFrom = "${aws_secretsmanager_secret.cube_app_secrets.arn}:DATABASE_URL::"
        },
        {
          name      = "BETTER_AUTH_SECRET"
          valueFrom = "${aws_secretsmanager_secret.cube_app_secrets.arn}:BETTER_AUTH_SECRET::"
        },
        {
          name      = "OPENROUTER_API_KEY"
          valueFrom = "${aws_secretsmanager_secret.cube_app_secrets.arn}:OPENROUTER_API_KEY::"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.cube_api_logs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "api"
        }
      }
    }
  ])

  tags = {
    Name        = "${var.environment}-cube-ai-api-task"
    Environment = var.environment
  }
}

# ECS Fargate Service for NestJS API (Behind ALB)
resource "aws_ecs_service" "cube_api_service" {
  name            = "${var.environment}-cube-ai-api-service"
  cluster         = aws_ecs_cluster.cube_cluster.id
  task_definition = aws_ecs_task_definition.cube_api_task.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = module.vpc.private_subnets
    security_groups  = [aws_security_group.cube_ecs_api_sg.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.cube_api_tg.arn
    container_name   = "cube-ai-api"
    container_port   = 8000
  }

  depends_on = [aws_lb_listener.cube_http]

  tags = {
    Name        = "${var.environment}-cube-ai-api-service"
    Environment = var.environment
  }
}

# ECS Task Definition for Ingestion Worker
resource "aws_ecs_task_definition" "cube_worker_task" {
  family                   = "${var.environment}-cube-ai-worker"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "2048" # 2 vCPU
  memory                   = "4096" # 4 GB
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_worker_task_role.arn

  container_definitions = jsonencode([
    {
      name      = "cube-ai-worker"
      image     = "${aws_ecr_repository.cube_worker.repository_url}:latest"
      essential = true

      environment = [
        { name = "NODE_ENV", value = "production" },
        { name = "STORAGE_DRIVER", value = "s3" },
        { name = "AWS_REGION", value = var.aws_region },
        { name = "AWS_S3_BUCKET_NAME", value = aws_s3_bucket.cube_ai_storage.id },
        { name = "SQS_QUEUE_URL", value = aws_sqs_queue.cube_ingestion_queue.url }
      ]

      secrets = [
        {
          name      = "DATABASE_URL"
          valueFrom = "${aws_secretsmanager_secret.cube_app_secrets.arn}:DATABASE_URL::"
        },
        {
          name      = "OPENROUTER_API_KEY"
          valueFrom = "${aws_secretsmanager_secret.cube_app_secrets.arn}:OPENROUTER_API_KEY::"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.cube_worker_logs.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "worker"
        }
      }
    }
  ])

  tags = {
    Name        = "${var.environment}-cube-ai-worker-task"
    Environment = var.environment
  }
}

# ECS Fargate Service for Ingestion Worker
resource "aws_ecs_service" "cube_worker_service" {
  name            = "${var.environment}-cube-ai-worker-service"
  cluster         = aws_ecs_cluster.cube_cluster.id
  task_definition = aws_ecs_task_definition.cube_worker_task.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = module.vpc.private_subnets
    security_groups  = [aws_security_group.cube_ecs_worker_sg.id]
    assign_public_ip = false
  }

  tags = {
    Name        = "${var.environment}-cube-ai-worker-service"
    Environment = var.environment
  }
}
