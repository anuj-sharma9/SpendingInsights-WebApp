# SpendingWebApp - AWS EKS Deployment Guide

This guide walks you through deploying the SpendingWebApp to AWS EKS with a custom domain.

## 📋 Prerequisites

Before you begin, ensure you have:

1. **AWS Account** with appropriate permissions (EKS, ECR, Route53, ACM, IAM)
2. **AWS CLI** installed and configured
   ```bash
   aws configure
   ```
3. **Docker** installed and running
4. **kubectl** installed
5. **eksctl** installed ([installation guide](https://eksctl.io/installation/))
6. **Helm** installed ([installation guide](https://helm.sh/docs/intro/install/))

## 🚨 Security: Protecting Sensitive Files

**IMPORTANT**: Before committing to GitHub, ensure these files are NEVER committed:

| File | Why It's Sensitive |
|------|-------------------|
| `ServiceAccountInfo/ServiceAccount.json` | Contains Firebase private key |
| `infra/k8s/secrets.yaml` | Contains database passwords |
| `.env` files | Contains API keys and credentials |

These are already added to `.gitignore`. Verify with:
```bash
git status --ignored
```

---

## 🚀 Deployment Steps

### Step 1: Set Up AWS ECR (Container Registry)

```bash
# Set your AWS region
export AWS_REGION="us-east-1"
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Create ECR repositories
aws ecr create-repository --repository-name spending-backend --region $AWS_REGION
aws ecr create-repository --repository-name spending-frontend --region $AWS_REGION

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
```

### Step 2: Build and Push Docker Images

```bash
# Set Firebase environment variables for the frontend build
export VITE_FIREBASE_API_KEY="your-api-key"
export VITE_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
export VITE_FIREBASE_PROJECT_ID="your-project-id"
export VITE_FIREBASE_APP_ID="your-app-id"

# Build and push backend
docker build -t ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/spending-backend:latest ./backend
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/spending-backend:latest

# Build and push frontend
docker build \
  --build-arg VITE_FIREBASE_API_KEY="$VITE_FIREBASE_API_KEY" \
  --build-arg VITE_FIREBASE_AUTH_DOMAIN="$VITE_FIREBASE_AUTH_DOMAIN" \
  --build-arg VITE_FIREBASE_PROJECT_ID="$VITE_FIREBASE_PROJECT_ID" \
  --build-arg VITE_FIREBASE_APP_ID="$VITE_FIREBASE_APP_ID" \
  -t ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/spending-frontend:latest \
  ./frontend
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/spending-frontend:latest
```

### Step 3: Create EKS Cluster

```bash
export CLUSTER_NAME="spending-app-cluster"

# Create EKS cluster (takes 15-20 minutes)
eksctl create cluster \
  --name $CLUSTER_NAME \
  --region $AWS_REGION \
  --version 1.28 \
  --nodegroup-name standard-workers \
  --node-type t3.medium \
  --nodes 2 \
  --nodes-min 1 \
  --nodes-max 4 \
  --managed

# Configure kubectl
aws eks update-kubeconfig --name $CLUSTER_NAME --region $AWS_REGION

# Verify connection
kubectl get nodes
```

### Step 4: Install AWS Load Balancer Controller

```bash
# Download IAM policy
curl -o iam_policy.json https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.6.0/docs/install/iam_policy.json

# Create IAM policy
aws iam create-policy \
  --policy-name AWSLoadBalancerControllerIAMPolicy \
  --policy-document file://iam_policy.json

# Create IAM service account
eksctl create iamserviceaccount \
  --cluster=$CLUSTER_NAME \
  --namespace=kube-system \
  --name=aws-load-balancer-controller \
  --attach-policy-arn=arn:aws:iam::${AWS_ACCOUNT_ID}:policy/AWSLoadBalancerControllerIAMPolicy \
  --override-existing-serviceaccounts \
  --approve \
  --region $AWS_REGION

# Install using Helm
helm repo add eks https://aws.github.io/eks-charts
helm repo update

helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=$CLUSTER_NAME \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller

# Verify installation
kubectl get deployment -n kube-system aws-load-balancer-controller
```

### Step 5: Update Kubernetes Manifests

Update the image references in `infra/k8s/backend.yaml` and `infra/k8s/frontend.yaml`:

```bash
# Replace placeholders with your values
sed -i '' "s|<AWS_ACCOUNT_ID>|${AWS_ACCOUNT_ID}|g" infra/k8s/*.yaml
sed -i '' "s|<AWS_REGION>|${AWS_REGION}|g" infra/k8s/*.yaml
```

### Step 6: Create Kubernetes Secrets

```bash
# Create namespace
kubectl apply -f infra/k8s/namespace.yaml

# Create secrets (use a strong password in production!)
kubectl create secret generic app-secrets \
  --namespace=spending-app \
  --from-literal=db-password="YOUR_STRONG_PASSWORD" \
  --from-file=firebase-service-account=ServiceAccountInfo/ServiceAccount.json
```

### Step 7: Deploy Application

```bash
# Apply all Kubernetes manifests
kubectl apply -f infra/k8s/

# Watch the deployment
kubectl -n spending-app get pods -w

# Wait for all deployments to be ready
kubectl -n spending-app rollout status deployment/postgres
kubectl -n spending-app rollout status deployment/redis
kubectl -n spending-app rollout status deployment/backend
kubectl -n spending-app rollout status deployment/frontend
kubectl -n spending-app rollout status deployment/nginx-gateway
```

### Step 8: Get Application URL

```bash
# Get the Load Balancer URL
kubectl -n spending-app get svc nginx-gateway

# The EXTERNAL-IP column shows your application URL
# Example: a1234567890.us-east-1.elb.amazonaws.com
```

---

## 🌐 Setting Up a Custom Domain

### Option A: Using AWS Route 53 (Recommended)

#### 1. Register or Transfer Domain

1. Go to **AWS Route 53** > **Registered domains**
2. Register a new domain or transfer an existing one
3. Wait for domain registration to complete

#### 2. Create SSL Certificate

1. Go to **AWS Certificate Manager (ACM)**
2. Click **Request a certificate**
3. Choose **Request a public certificate**
4. Enter your domain: `yourdomain.com` and `*.yourdomain.com`
5. Choose **DNS validation**
6. If using Route 53, click **Create records in Route 53**
7. Wait for validation (usually 5-30 minutes)
8. Copy the **Certificate ARN**

#### 3. Update Ingress with Certificate

Edit `infra/k8s/ingress.yaml`:

```yaml
metadata:
  annotations:
    alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:us-east-1:123456789:certificate/abc-123
spec:
  rules:
    - host: app.yourdomain.com
```

Apply the ingress:
```bash
kubectl apply -f infra/k8s/ingress.yaml
```

#### 4. Create DNS Record

1. Go to **Route 53** > **Hosted zones** > your domain
2. Click **Create record**
3. Configure:
   - **Record name**: `app` (or leave blank for root domain)
   - **Record type**: `A`
   - **Alias**: `Yes`
   - **Route traffic to**: `Alias to Application and Classic Load Balancer`
   - **Region**: Your AWS region
   - **Load balancer**: Select your ALB (created by the ingress)
4. Click **Create records**

Your app will be available at `https://app.yourdomain.com` in 5-10 minutes!

### Option B: Using External Domain Registrar

If your domain is registered elsewhere (GoDaddy, Namecheap, etc.):

1. Get the Load Balancer hostname:
   ```bash
   kubectl -n spending-app get ingress spending-app-ingress -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
   ```

2. In your domain registrar, create a **CNAME record**:
   - **Name**: `app` (or your subdomain)
   - **Value**: `your-load-balancer-hostname.amazonaws.com`

---

## 💰 Cost Estimation (Monthly)

| Resource | Estimated Cost |
|----------|---------------|
| EKS Cluster | $73/month |
| EC2 (2x t3.medium) | ~$60/month |
| Load Balancer | ~$20/month |
| EBS Storage (10GB) | ~$1/month |
| Route 53 | ~$0.50/month |
| **Total** | **~$155/month** |

**Cost Optimization Tips:**
- Use Spot Instances for non-critical workloads
- Scale down during off-hours
- Use Reserved Instances for long-term savings

---

## 🔧 Useful Commands

```bash
# View all resources
kubectl -n spending-app get all

# View logs
kubectl -n spending-app logs deployment/backend
kubectl -n spending-app logs deployment/frontend

# Restart a deployment
kubectl -n spending-app rollout restart deployment/backend

# Scale deployment
kubectl -n spending-app scale deployment/backend --replicas=3

# Delete everything
kubectl delete namespace spending-app

# Delete EKS cluster (when you're done)
eksctl delete cluster --name $CLUSTER_NAME --region $AWS_REGION
```

---

## 🔄 CI/CD with GitHub Actions

Create `.github/workflows/deploy.yml` for automated deployments:

```yaml
name: Deploy to EKS

on:
  push:
    branches: [main]

env:
  AWS_REGION: us-east-1
  CLUSTER_NAME: spending-app-cluster

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
      
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2
      
      - name: Build and push images
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
        run: |
          docker build -t $ECR_REGISTRY/spending-backend:${{ github.sha }} ./backend
          docker push $ECR_REGISTRY/spending-backend:${{ github.sha }}
          
          docker build \
            --build-arg VITE_FIREBASE_API_KEY=${{ secrets.VITE_FIREBASE_API_KEY }} \
            --build-arg VITE_FIREBASE_AUTH_DOMAIN=${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }} \
            --build-arg VITE_FIREBASE_PROJECT_ID=${{ secrets.VITE_FIREBASE_PROJECT_ID }} \
            --build-arg VITE_FIREBASE_APP_ID=${{ secrets.VITE_FIREBASE_APP_ID }} \
            -t $ECR_REGISTRY/spending-frontend:${{ github.sha }} ./frontend
          docker push $ECR_REGISTRY/spending-frontend:${{ github.sha }}
      
      - name: Deploy to EKS
        run: |
          aws eks update-kubeconfig --name ${{ env.CLUSTER_NAME }} --region ${{ env.AWS_REGION }}
          kubectl set image deployment/backend backend=$ECR_REGISTRY/spending-backend:${{ github.sha }} -n spending-app
          kubectl set image deployment/frontend frontend=$ECR_REGISTRY/spending-frontend:${{ github.sha }} -n spending-app
```

**Required GitHub Secrets:**
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`

