<p align="center">
  <img src="assets/logo.png" alt="Cube AI logo" width="200" />
</p>

<h1 align="center">Cube AI</h1>

<p align="center"><strong>Enterprise Multi-Tenant AI Maintenance & Documentation Platform</strong></p>

<p align="center">
  <img src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/Next.js%2016-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Qdrant-DC2626?style=for-the-badge&logo=qdrant&logoColor=white" alt="Qdrant" />
  <img src="https://img.shields.io/badge/Terraform-7B42BC?style=for-the-badge&logo=terraform&logoColor=white" alt="Terraform" />
  <img src="https://img.shields.io/badge/AWS%20ECS%20Fargate-FF9900?style=for-the-badge&logo=amazon-aws&logoColor=white" alt="AWS" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
</p>

---

## 📌 Executive Summary

**Cube AI** is a production-grade, multi-tenant SaaS platform built for field-service organizations (HVAC, elevators, solar installations, generators, fire safety, and industrial machinery). 

Field engineers and technicians upload heavy technical manuals, schematics, and service bulletins once. Through an intelligent **Retrieval-Augmented Generation (RAG)** pipeline, technicians receive instant, streaming, and **strictly page-cited answers** in the field, complete with an embedded interactive PDF viewer that jumps directly to the cited source page.

---

## 🏗️ System Architecture

```text
                                   ┌──────────────────────────────────┐
                                   │       Client Browser / App       │
                                   └───────────────┬──────────────────┘
                                                   │
                            HTTP / HTTPS / SSE     ▼
                   ┌──────────────────────────────────────────────────┐
                   │          Application Load Balancer (ALB)         │
                   └───────┬──────────────────────────────────┬───────┘
                           │ :3000 (UI)                       │ :8000 (API)
                           ▼                                  ▼
             ┌───────────────────────────┐      ┌───────────────────────────┐
             │    Next.js 16 Frontend    │      │    NestJS Backend API     │
             │   (React 19 / Tailwind)   │      │    (ECS Fargate / Node)   │
             └───────────────────────────┘      └──────────────┬────────────┘
                                                               │
                     ┌─────────────────────────────────────────┼────────────────────────────────────────┐
                     │                                         │                                        │
                     ▼                                         ▼                                        ▼
       ┌───────────────────────────┐             ┌───────────────────────────┐            ┌───────────────────────────┐
       │   Amazon RDS PostgreSQL   │             │   Qdrant Vector Database  │            │      Amazon S3 Bucket     │
       │    (Drizzle ORM / Auth)   │             │  (Per-Tenant Collections) │            │  (Documents & Storage)    │
       └───────────────────────────┘             └───────────────────────────┘            └───────────────────────────┘
                     │                                         │                                        │
                     └─────────────────────────────────────────┼────────────────────────────────────────┘
                                                               │
                                                               ▼
                                                 ┌───────────────────────────┐
                                                 │   Amazon SQS + DLQ Queue  │
                                                 │  (Async Doc Ingestion)    │
                                                 └───────────────────────────┘
```

---

## 🚀 Key Highlights & Features

### 1. Multi-Tenant Vector Isolation
- True multi-tenancy: Documents, conversations, and vector spaces are strictly isolated per tenant organization.
- Collections are dynamically provisioned in Qdrant as `documents_{orgId}`.
- Dynamic vector dimension auto-detection at runtime — no hardcoded embedding dimensions.

### 2. Precise Page-Level Citation Engine
- **Single-page chunking boundary**: Text is extracted per page and chunked within page boundaries, guaranteeing that citations **never point to the wrong page**.
- Assistant answers stream token-by-token over Server-Sent Events (SSE) with inline `[1]`, `[2]` citation markers.
- Citations are persisted in PostgreSQL, enabling accurate historical replay of chat sessions with their source references.

### 3. Integrated PDF Document Viewer
- Clicking any citation marker opens a split-screen in-app PDF viewer powered by `react-pdf`, automatically jumping to the exact page referenced by the AI model.

### 4. Enterprise AWS Cloud Architecture (IaC with Terraform)
- Fully automated provisioning of cloud infrastructure using modular **Terraform**:
  - **Networking**: VPC across 2 Availability Zones, Public/Private Subnets, NAT Gateways, Internet Gateway.
  - **Compute**: ECS Cluster with Fargate serverless tasks running the containerized NestJS API.
  - **Routing & Load Balancing**: AWS Application Load Balancer (ALB) with health checks and Target Groups.
  - **Database & Storage**: Amazon RDS PostgreSQL (Multi-AZ ready) and Amazon S3 with private access policies.
  - **Asynchronous Processing**: Amazon SQS queue with Dead Letter Queue (DLQ) for resilient ingestion pipelines.
  - **Security & IAM**: AWS Secrets Manager, least-privilege IAM roles, execution task policies, and strict Security Groups.
  - **Observability**: CloudWatch Log Groups for centralized container logging and monitoring.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend** | NestJS 11, TypeScript, RxJS, Node.js 22 |
| **Frontend** | Next.js 16 (App Router), React 19, Tailwind CSS v4, Lucide Icons, react-pdf |
| **Authentication** | Better Auth (session management, organization switching, RBAC) |
| **Databases** | PostgreSQL 16, Drizzle ORM (schema migrations & queries) |
| **Vector Engine** | Qdrant (HNSW index, cosine distance, payload filtering) |
| **AI / LLMs** | OpenRouter API (`nvidia/llama-nemotron-embed-vl-1b-v2`, `meta-llama/llama-3.3-70b-instruct`) |
| **Cloud Infrastructure** | AWS (ECS Fargate, ALB, RDS PostgreSQL, S3, SQS, Secrets Manager, CloudWatch, ECR) |
| **IaC & DevOps** | Terraform (AWS Provider >= 5.0), Docker, Docker Compose, Multi-Stage Builds |

---

## 🔄 Ingestion & RAG Pipeline

```text
[PDF Upload] ──► [Amazon S3 / Local Storage] ──► Status: "pending"
                        │
                        ▼
       [Extract Text Per Page (pdf-parse)]
                        │
                        ▼
       [Chunk within Page Boundaries (Overlap)]
                        │
                        ▼
       [Generate Embeddings via OpenRouter API]
                        │
                        ▼
       [Upsert Vectors to Qdrant (documents_{orgId})] ──► Status: "indexed"
```

```text
[Technician Query] ──► [Generate Query Embedding]
                              │
                              ▼
                     [Qdrant Similarity Search (Top-K)]
                              │
                              ▼
                     [Assemble Context & Chat History]
                              │
                              ▼
                     [OpenRouter Chat Model (Streaming SSE)]
                              │
                              ▼
                     [Persist Message & Citations to DB] ──► [Frontend Render]
```

---

## 🐳 Quickstart with Docker Compose

Follow these steps to clone and run the full stack (Frontend, NestJS Backend, PostgreSQL, and Qdrant vector database) using Docker.

### 1. Prerequisites
- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) (or [Docker Desktop](https://www.docker.com/products/docker-desktop/)) installed and running.
- An [OpenRouter API Key](https://openrouter.ai/) for LLM chat & embeddings.

### 2. Clone the Repository & Configure Environment

```bash
# 1. Clone the repository
git clone https://github.com/Suralmk/cube-ai.git
cd cube-ai

# 2. Copy the environment variables template
cp .env.example .env
```

Open `.env` in your text editor and provide your OpenRouter API key:
```env
OPENROUTER_API_KEY=your_actual_openrouter_api_key_here
```

### 3. Start the Docker Stack

#### Option A: Development Mode (Hot-Reloading)
Runs Next.js and NestJS in development mode with live code reloading:
```bash
docker compose up --build
```

#### Option B: Production Mode (Optimized Multi-Stage Containers)
Builds and runs optimized production images in detached background mode:
```bash
docker compose -f docker-compose.prod.yml up --build -d
```

### 4. Apply Database Migrations
Once the containers are running and PostgreSQL is healthy, apply the database schema migrations:
```bash
docker compose exec api pnpm run db:apply
```

### 5. Access the Services

| Service | URL | Description |
| :--- | :--- | :--- |
| **Frontend Web App** | `http://localhost:3000` | Next.js 16 Web Dashboard |
| **Backend API** | `http://localhost:8000/api/v1` | NestJS REST API |
| **API Health Check** | `http://localhost:8000/health/ready` | DB & Vector DB Status |
| **Qdrant Vector DB** | `http://localhost:6333/dashboard` | Qdrant Web Dashboard |
| **PostgreSQL** | `localhost:5432` | User: `postgres`, DB: `cube_ai` |

### 6. Stop the Application
To stop all running services:
```bash
docker compose down
```
> Add `-v` if you want to remove persistent volumes as well (`docker compose down -v`).

---

## ☁️ AWS Production Deployment (Terraform)

The `terraform/` directory defines the complete AWS infrastructure stack:

```bash
cd terraform

# Initialize Terraform providers
terraform init

# Validate configuration
terraform validate

# Plan infrastructure changes
terraform plan -out=tfplan

# Apply to AWS
terraform apply tfplan
```

### Infrastructure Components Provisioned:
- **`vpc.tf`**: Custom VPC, Multi-AZ public & private subnets, NAT Gateway.
- **`security_groups.tf`**: Isolated security group hierarchy (ALB ➔ ECS ➔ RDS/Qdrant).
- **`ecs.tf`**: ECS Cluster, Task Definitions, Fargate Service, auto-scaling & container definitions.
- **`alb.tf`**: Application Load Balancer, HTTP/HTTPS listeners, and health check target groups.
- **`rds.tf`**: PostgreSQL RDS instance with encrypted storage and automated backups.
- **`s3.tf`**: S3 bucket with strict private access and CORS configuration for presigned URLs.
- **`sqs.tf`**: Document processing queue with Dead Letter Queue (DLQ).
- **`secrets_manager.tf`**: AWS Secrets Manager for secure runtime secret injection.
- **`iam.tf`**: Least-privilege IAM roles for ECS Task Execution and S3/SQS access.
- **`cloudwatch.tf`**: Centralized log streaming for backend services.

---

## 💻 Local Manual Development Setup

If you prefer running the services without Docker:

```bash
# 1. Install Backend Dependencies
pnpm install

# 2. Install Frontend Dependencies
cd frontend && pnpm install && cd ..

# 3. Apply Database Migrations
pnpm run db:generate
pnpm run db:push

# 4. Start Backend in Watch Mode
pnpm run start:dev

# 5. Start Frontend in Development Mode
cd frontend && pnpm run dev
```

---

## 🛡️ Database Management (Drizzle ORM)

```bash
pnpm run db:generate   # Generate SQL migrations from schema
pnpm run db:migrate    # Apply migrations via Drizzle Kit
pnpm run db:push       # Push schema directly to database (dev)
pnpm run db:studio     # Launch Drizzle Studio DB GUI
```

---

## 📄 License

UNLICENSED — Private project.
