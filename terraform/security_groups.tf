# Security Group for ALB (Accepts HTTP/HTTPS from the internet)
resource "aws_security_group" "cube_alb_sg" {
  name        = "${var.environment}-cube-alb-sg"
  description = "Security group for ALB"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description = "HTTP from Internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS from Internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.environment}-cube-alb-sg"
    Environment = var.environment
  }
}

# Security Group for ECS API Service (Accepts port 8000 from ALB only)
resource "aws_security_group" "cube_ecs_api_sg" {
  name        = "${var.environment}-cube-ecs-api-sg"
  description = "Security group for ECS API tasks"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description     = "HTTP from ALB"
    from_port       = 8000
    to_port         = 8000
    protocol        = "tcp"
    security_groups = [aws_security_group.cube_alb_sg.id]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.environment}-cube-ecs-api-sg"
    Environment = var.environment
  }
}

# Security Group for ECS Ingestion Worker Tasks (No ingress needed)
resource "aws_security_group" "cube_ecs_worker_sg" {
  name        = "${var.environment}-cube-ecs-worker-sg"
  description = "Security group for ECS Worker tasks"
  vpc_id      = module.vpc.vpc_id

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.environment}-cube-ecs-worker-sg"
    Environment = var.environment
  }
}

# Security Group for RDS PostgreSQL (Accepts port 5432 from ECS tasks only)
resource "aws_security_group" "cube_rds_sg" {
  name        = "${var.environment}-cube-rds-sg"
  description = "Security group for RDS PostgreSQL"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description     = "PostgreSQL from ECS API"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.cube_ecs_api_sg.id]
  }

  ingress {
    description     = "PostgreSQL from ECS Worker"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.cube_ecs_worker_sg.id]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${var.environment}-cube-rds-sg"
    Environment = var.environment
  }
}