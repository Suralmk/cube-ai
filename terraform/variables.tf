variable "aws_region" {
    type = string
    default  = "us-east-2"
}

variable "bucket_name" {
    type = string
    default  = "cube-ai"
}

variable "environment" {
  type        = string
  default     = "prod"
}

variable "db_name" {
  type        = string
  default     = "cube_ai"
}

variable "db_username" {
  type        = string
  default     = "postgres"
}

variable "db_password" {
  type        = string
  description = "Master password for RDS database instance"
  sensitive   = true
}

