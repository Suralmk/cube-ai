resource "aws_lb" "cube_alb" {
  name               = "${var.environment}-cube-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.cube_alb_sg.id]
  subnets            = module.vpc.public_subnets
  idle_timeout       = 300 # Required for long-running LLM SSE streaming connections

  tags = {
    Name        = "${var.environment}-cube-alb"
    Environment = var.environment
  }
}

# Target Group for ECS API Service (Fargate ip target type)
resource "aws_lb_target_group" "cube_api_tg" {
  name        = "${var.environment}-cube-api-tg"
  port        = 8000
  protocol    = "HTTP"
  vpc_id      = module.vpc.vpc_id
  target_type = "ip"

  health_check {
    path                = "/health/live"
    port                = "8000"
    protocol            = "HTTP"
    interval            = 15
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
    matcher             = "200"
  }

  tags = {
    Name        = "${var.environment}-cube-api-tg"
    Environment = var.environment
  }
}

# HTTP Listener
resource "aws_lb_listener" "cube_http" {
  load_balancer_arn = aws_lb.cube_alb.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.cube_api_tg.arn
  }
}


