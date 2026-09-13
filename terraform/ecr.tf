# ECR Repository for NestJS API
resource "aws_ecr_repository" "cube_api" {
  name                 = "${var.environment}-cube-ai-api"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name        = "${var.environment}-cube-ai-api"
    Environment = var.environment
  }
}

# ECR Repository for Ingestion Worker
resource "aws_ecr_repository" "cube_worker" {
  name                 = "${var.environment}-cube-ai-worker"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name        = "${var.environment}-cube-ai-worker"
    Environment = var.environment
  }
}

# Lifecycle Policy: retain last 15 images
resource "aws_ecr_lifecycle_policy" "cube_api_lifecycle" {
  repository = aws_ecr_repository.cube_api.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Retain last 15 images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 15
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

resource "aws_ecr_lifecycle_policy" "cube_worker_lifecycle" {
  repository = aws_ecr_repository.cube_worker.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Retain last 15 images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 15
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
