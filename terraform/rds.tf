# RDS PostgreSQL Database Instance
resource "aws_db_instance" "cube_postgres" {
  identifier        = "${var.environment}-cube-postgres"
  engine            = "postgres"
  engine_version    = "16.3"
  instance_class    = "db.t4g.micro"
  allocated_storage = 20
  max_allocated_storage = 100

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = module.vpc.database_subnet_group_name
  vpc_security_group_ids = [aws_security_group.cube_rds_sg.id]

  publicly_accessible = false
  skip_final_snapshot = true
  deletion_protection = false

  tags = {
    Name        = "${var.environment}-cube-postgres"
    Environment = var.environment
  }
}
