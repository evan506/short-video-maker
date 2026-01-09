# Remotion Render Worker Deployment Guide

## Overview

The Remotion Render Worker runs on AWS ECS Fargate and processes video rendering jobs asynchronously.

## Architecture

```
┌─────────────────┐
│   Load Balancer │ (Health checks only)
└────────┬────────┘
         │
┌────────▼────────┐
│  ECS Fargate    │ (2 vCPU, 4GB RAM)
│  - Worker 1     │
│  - Worker 2     │
│  - Worker N     │
└────────┬────────┘
         │
┌────────▼────────┐
│   Supabase DB   │ (PostgreSQL)
│  - Job Queue    │
│  - Render Jobs  │
└─────────────────┘
```

## Local Development

### Prerequisites

- Docker Desktop installed
- Supabase project running
- Environment variables configured

### Running Locally

```bash
# Build and start worker
docker-compose -f docker-compose.worker.yml up --build

# View logs
docker-compose -f docker-compose.worker.yml logs -f

# Stop worker
docker-compose -f docker-compose.worker.yml down
```

### Environment Variables

Create a `.env` file with:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GOOGLE_CLOUD_TTS_KEY=path/to/google-credentials.json
PEXELS_API_KEY=your-pexels-api-key
```

## AWS ECS Deployment

### Prerequisites

- AWS CLI configured
- ECR repository created
- ECS cluster created
- IAM roles configured (task execution role and task role)

### Build and Push Docker Image

```bash
# Log in to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Build image
docker build -f Dockerfile.worker -t ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/remotion-worker:latest .

# Push image
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/remotion-worker:latest
```

### Register Task Definition

```bash
# Update account ID and region in task definition JSON
sed -i 's/ACCOUNT_ID/123456789012/g' deployment/ecs/remotion-worker-task-definition.json
sed -i 's/REGION/us-east-1/g' deployment/ecs/remotion-worker-task-definition.json

# Register task definition
aws ecs register-task-definition \
  --cli-input-json file://deployment/ecs/remotion-worker-task-definition.json
```

### Create ECS Service

```bash
aws ecs create-service \
  --cluster short-video-maker \
  --service-name remotion-worker \
  --task-definition remotion-worker \
  --desired-count 2 \
  --launch-type FARGATE \
  --platform-version LATEST \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-abc123,subnet-def456],securityGroups=[sg-abc123],assignPublicIp=ENABLED}" \
  --health-check-grace-period-seconds 60
```

### Update Service

```bash
# Force new deployment
aws ecs update-service \
  --cluster short-video-maker \
  --service remotion-worker \
  --task-definition remotion-worker \
  --force-new-deployment
```

## Monitoring

### Health Checks

- Health check endpoint: `http://worker-ip:9000/health`
- Check interval: 30 seconds
- Timeout: 5 seconds
- Retries: 3

### CloudWatch Logs

Log group: `/ecs/remotion-worker`

View logs:
```bash
aws logs tail /ecs/remotion-worker --follow
```

### Metrics to Monitor

- Job processing rate (jobs/minute)
- Average job duration
- Error rate (failed jobs / total jobs)
- Worker CPU and memory utilization
- Stalled job count

## Scaling

### Auto Scaling

Create a target tracking scaling policy:

```bash
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/short-video-manager/remotion-worker \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name remotion-worker-scale-policy \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration file://scaling-policy.json
```

Example `scaling-policy.json`:

```json
{
  "TargetValue": 5.0,
  "PredefinedMetricSpecification": {
    "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
  },
  "ScaleOutCooldown": 300,
  "ScaleInCooldown": 300,
  "SuspendedState": {
    "DynamicScalingInSuspended": false
  }
}
```

## Troubleshooting

### Worker Not Processing Jobs

1. Check health endpoint: `curl http://localhost:9000/health`
2. Check logs: `docker-compose logs -f remotion-worker`
3. Verify database connection: Check Supabase credentials
4. Check for queued jobs: `SELECT * FROM render_jobs WHERE status='queued'`

### Jobs Getting Stuck

1. Check stalled job reaper is running (should log every 5 minutes)
2. Verify job update timestamp: `SELECT updated_at FROM render_jobs WHERE id='job-id'`
3. Check for exceptions in worker logs

### High Memory Usage

1. Check Remotion bundle size: Should clean up after each render
2. Limit concurrent renders (default: 1 per worker)
3. Increase task memory if needed (4GB → 8GB)

## Security Notes

- Service role key is required for RLS bypass during rendering
- Never expose service role key to client-side code
- Use AWS Secrets Manager for sensitive credentials
- Enable VPC endpoints for database access
- Restrict security group ingress to only necessary ports
