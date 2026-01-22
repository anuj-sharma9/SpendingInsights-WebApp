#!/bin/bash
set -e

# =====================================================
# SpendingWebApp - AWS EKS Deployment Script
# =====================================================
# Prerequisites:
# - AWS CLI configured with appropriate permissions
# - Docker installed and running
# - kubectl installed
# - eksctl installed (for EKS cluster management)
# =====================================================

# Configuration - MODIFY THESE VALUES
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID=""  # Will be auto-detected if empty
CLUSTER_NAME="spending-app-cluster"
ECR_BACKEND_REPO="spending-backend"
ECR_FRONTEND_REPO="spending-frontend"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Get AWS Account ID if not set
if [ -z "$AWS_ACCOUNT_ID" ]; then
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    log_info "Detected AWS Account ID: $AWS_ACCOUNT_ID"
fi

ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# =====================================================
# Functions
# =====================================================

create_ecr_repos() {
    log_info "Creating ECR repositories..."
    
    for repo in $ECR_BACKEND_REPO $ECR_FRONTEND_REPO; do
        if aws ecr describe-repositories --repository-names "$repo" --region "$AWS_REGION" 2>/dev/null; then
            log_info "Repository $repo already exists"
        else
            aws ecr create-repository \
                --repository-name "$repo" \
                --region "$AWS_REGION" \
                --image-scanning-configuration scanOnPush=true
            log_info "Created repository: $repo"
        fi
    done
}

login_ecr() {
    log_info "Logging into ECR..."
    aws ecr get-login-password --region "$AWS_REGION" | \
        docker login --username AWS --password-stdin "$ECR_REGISTRY"
}

build_and_push_images() {
    log_info "Building and pushing Docker images..."
    
    # Build and push backend
    log_info "Building backend image..."
    docker build -t "${ECR_REGISTRY}/${ECR_BACKEND_REPO}:latest" ./backend
    docker push "${ECR_REGISTRY}/${ECR_BACKEND_REPO}:latest"
    
    # Build and push frontend (requires Firebase config)
    log_info "Building frontend image..."
    if [ -z "$VITE_FIREBASE_API_KEY" ]; then
        log_error "VITE_FIREBASE_API_KEY not set. Please set Firebase environment variables."
        log_error "Required: VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_APP_ID"
        exit 1
    fi
    
    docker build \
        --build-arg VITE_FIREBASE_API_KEY="$VITE_FIREBASE_API_KEY" \
        --build-arg VITE_FIREBASE_AUTH_DOMAIN="$VITE_FIREBASE_AUTH_DOMAIN" \
        --build-arg VITE_FIREBASE_PROJECT_ID="$VITE_FIREBASE_PROJECT_ID" \
        --build-arg VITE_FIREBASE_APP_ID="$VITE_FIREBASE_APP_ID" \
        -t "${ECR_REGISTRY}/${ECR_FRONTEND_REPO}:latest" \
        ./frontend
    docker push "${ECR_REGISTRY}/${ECR_FRONTEND_REPO}:latest"
    
    log_info "Images pushed successfully!"
}

create_eks_cluster() {
    log_info "Creating EKS cluster (this may take 15-20 minutes)..."
    
    eksctl create cluster \
        --name "$CLUSTER_NAME" \
        --region "$AWS_REGION" \
        --version 1.28 \
        --nodegroup-name standard-workers \
        --node-type t3.medium \
        --nodes 2 \
        --nodes-min 1 \
        --nodes-max 4 \
        --managed
    
    log_info "EKS cluster created successfully!"
}

configure_kubectl() {
    log_info "Configuring kubectl for EKS cluster..."
    aws eks update-kubeconfig --name "$CLUSTER_NAME" --region "$AWS_REGION"
}

install_aws_load_balancer_controller() {
    log_info "Installing AWS Load Balancer Controller..."
    
    # Create IAM policy
    curl -o iam_policy.json https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.6.0/docs/install/iam_policy.json
    
    aws iam create-policy \
        --policy-name AWSLoadBalancerControllerIAMPolicy \
        --policy-document file://iam_policy.json 2>/dev/null || true
    
    # Create IAM service account
    eksctl create iamserviceaccount \
        --cluster="$CLUSTER_NAME" \
        --namespace=kube-system \
        --name=aws-load-balancer-controller \
        --attach-policy-arn="arn:aws:iam::${AWS_ACCOUNT_ID}:policy/AWSLoadBalancerControllerIAMPolicy" \
        --override-existing-serviceaccounts \
        --approve \
        --region "$AWS_REGION"
    
    # Install the controller using Helm
    helm repo add eks https://aws.github.io/eks-charts 2>/dev/null || true
    helm repo update
    
    helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
        -n kube-system \
        --set clusterName="$CLUSTER_NAME" \
        --set serviceAccount.create=false \
        --set serviceAccount.name=aws-load-balancer-controller
    
    rm -f iam_policy.json
    log_info "AWS Load Balancer Controller installed!"
}

update_k8s_manifests() {
    log_info "Updating Kubernetes manifests with ECR registry..."
    
    # Update image references in manifests
    sed -i.bak "s|<AWS_ACCOUNT_ID>|${AWS_ACCOUNT_ID}|g" infra/k8s/*.yaml
    sed -i.bak "s|<AWS_REGION>|${AWS_REGION}|g" infra/k8s/*.yaml
    rm -f infra/k8s/*.yaml.bak
    
    log_info "Manifests updated!"
}

create_secrets() {
    log_info "Creating Kubernetes secrets..."
    
    if [ ! -f "ServiceAccountInfo/ServiceAccount.json" ]; then
        log_error "Firebase ServiceAccount.json not found!"
        exit 1
    fi
    
    # Create namespace first
    kubectl apply -f infra/k8s/namespace.yaml
    
    # Create secrets
    kubectl create secret generic app-secrets \
        --namespace=spending-app \
        --from-literal=db-password="${DB_PASSWORD:-spending}" \
        --from-file=firebase-service-account=ServiceAccountInfo/ServiceAccount.json \
        --dry-run=client -o yaml | kubectl apply -f -
    
    log_info "Secrets created!"
}

deploy_app() {
    log_info "Deploying application to EKS..."
    
    kubectl apply -f infra/k8s/namespace.yaml
    kubectl apply -f infra/k8s/
    
    log_info "Waiting for deployments to be ready..."
    kubectl -n spending-app rollout status deployment/postgres --timeout=120s
    kubectl -n spending-app rollout status deployment/redis --timeout=60s
    kubectl -n spending-app rollout status deployment/backend --timeout=120s
    kubectl -n spending-app rollout status deployment/frontend --timeout=60s
    kubectl -n spending-app rollout status deployment/nginx-gateway --timeout=60s
    
    log_info "Application deployed successfully!"
}

get_load_balancer_url() {
    log_info "Getting Load Balancer URL..."
    
    LB_URL=$(kubectl -n spending-app get svc nginx-gateway -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null)
    
    if [ -z "$LB_URL" ]; then
        log_warn "Load balancer not ready yet. Run this command to check:"
        echo "kubectl -n spending-app get svc nginx-gateway"
    else
        log_info "Your application is available at: http://${LB_URL}"
    fi
}

# =====================================================
# Main Menu
# =====================================================

show_menu() {
    echo ""
    echo "=========================================="
    echo "  SpendingWebApp Deployment Script"
    echo "=========================================="
    echo "1) Full deployment (new cluster)"
    echo "2) Create ECR repositories only"
    echo "3) Build and push Docker images"
    echo "4) Deploy to existing cluster"
    echo "5) Get application URL"
    echo "6) Delete cluster"
    echo "0) Exit"
    echo ""
    read -p "Select an option: " choice
    
    case $choice in
        1)
            create_ecr_repos
            login_ecr
            build_and_push_images
            create_eks_cluster
            configure_kubectl
            install_aws_load_balancer_controller
            update_k8s_manifests
            create_secrets
            deploy_app
            get_load_balancer_url
            ;;
        2)
            create_ecr_repos
            ;;
        3)
            login_ecr
            build_and_push_images
            ;;
        4)
            configure_kubectl
            update_k8s_manifests
            create_secrets
            deploy_app
            get_load_balancer_url
            ;;
        5)
            get_load_balancer_url
            ;;
        6)
            log_warn "This will delete the EKS cluster and all resources!"
            read -p "Are you sure? (yes/no): " confirm
            if [ "$confirm" = "yes" ]; then
                eksctl delete cluster --name "$CLUSTER_NAME" --region "$AWS_REGION"
            fi
            ;;
        0)
            exit 0
            ;;
        *)
            log_error "Invalid option"
            ;;
    esac
}

# Check if running with an argument or show menu
if [ "$1" = "full" ]; then
    create_ecr_repos
    login_ecr
    build_and_push_images
    create_eks_cluster
    configure_kubectl
    install_aws_load_balancer_controller
    update_k8s_manifests
    create_secrets
    deploy_app
    get_load_balancer_url
else
    while true; do
        show_menu
    done
fi

