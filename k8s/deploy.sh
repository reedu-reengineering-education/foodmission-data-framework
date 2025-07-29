#!/bin/bash

# FOODMISSION Data Framework Kubernetes Deployment Script
# This script deploys the FOODMISSION Data Framework to Kubernetes

set -euo pipefail

# Configuration
NAMESPACE="foodmission"
DEPLOYMENT_NAME="foodmission-api"
IMAGE_TAG="${IMAGE_TAG:-latest}"
ENVIRONMENT="${ENVIRONMENT:-production}"
KUBECTL_CONTEXT="${KUBECTL_CONTEXT:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed or not in PATH"
        exit 1
    fi
    
    # Check if kustomize is installed
    if ! command -v kustomize &> /dev/null; then
        log_error "kustomize is not installed or not in PATH"
        exit 1
    fi
    
    # Check kubectl context
    if [[ -n "$KUBECTL_CONTEXT" ]]; then
        kubectl config use-context "$KUBECTL_CONTEXT"
    fi
    
    # Verify cluster connection
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Function to create namespace if it doesn't exist
create_namespace() {
    log_info "Creating namespace if it doesn't exist..."
    
    if kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log_info "Namespace $NAMESPACE already exists"
    else
        kubectl apply -f namespace.yaml
        log_success "Namespace $NAMESPACE created"
    fi
}

# Function to update secrets
update_secrets() {
    log_info "Updating secrets..."
    
    # Check if secrets file exists
    if [[ ! -f "secrets.yaml" ]]; then
        log_error "secrets.yaml file not found"
        exit 1
    fi
    
    # Apply secrets
    kubectl apply -f secrets.yaml
    log_success "Secrets updated"
}

# Function to deploy application
deploy_application() {
    log_info "Deploying application..."
    
    # Update image tag in kustomization
    if [[ "$IMAGE_TAG" != "latest" ]]; then
        kustomize edit set image "foodmission/data-framework:$IMAGE_TAG"
    fi
    
    # Apply all resources using kustomize
    kustomize build . | kubectl apply -f -
    
    log_success "Application deployed"
}

# Function to wait for deployment
wait_for_deployment() {
    log_info "Waiting for deployment to be ready..."
    
    # Wait for deployment to be ready
    kubectl rollout status deployment/"$DEPLOYMENT_NAME" -n "$NAMESPACE" --timeout=300s
    
    # Wait for pods to be ready
    kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=foodmission-data-framework -n "$NAMESPACE" --timeout=300s
    
    log_success "Deployment is ready"
}

# Function to run health checks
run_health_checks() {
    log_info "Running health checks..."
    
    # Get service endpoint
    SERVICE_IP=$(kubectl get service foodmission-api-service -n "$NAMESPACE" -o jsonpath='{.spec.clusterIP}')
    
    # Port forward for health check
    kubectl port-forward service/foodmission-api-service 8080:80 -n "$NAMESPACE" &
    PORT_FORWARD_PID=$!
    
    # Wait for port forward to be ready
    sleep 5
    
    # Run health checks
    if curl -f http://localhost:8080/health > /dev/null 2>&1; then
        log_success "Health check passed"
    else
        log_error "Health check failed"
        kill $PORT_FORWARD_PID
        exit 1
    fi
    
    # Clean up port forward
    kill $PORT_FORWARD_PID
}

# Function to display deployment info
display_deployment_info() {
    log_info "Deployment Information:"
    echo "========================"
    echo "Namespace: $NAMESPACE"
    echo "Deployment: $DEPLOYMENT_NAME"
    echo "Image Tag: $IMAGE_TAG"
    echo "Environment: $ENVIRONMENT"
    echo ""
    
    log_info "Pod Status:"
    kubectl get pods -n "$NAMESPACE" -l app.kubernetes.io/name=foodmission-data-framework
    echo ""
    
    log_info "Service Status:"
    kubectl get services -n "$NAMESPACE"
    echo ""
    
    log_info "Ingress Status:"
    kubectl get ingress -n "$NAMESPACE"
    echo ""
    
    log_info "HPA Status:"
    kubectl get hpa -n "$NAMESPACE"
}

# Function to rollback deployment
rollback_deployment() {
    log_warning "Rolling back deployment..."
    kubectl rollout undo deployment/"$DEPLOYMENT_NAME" -n "$NAMESPACE"
    kubectl rollout status deployment/"$DEPLOYMENT_NAME" -n "$NAMESPACE"
    log_success "Rollback completed"
}

# Function to cleanup deployment
cleanup_deployment() {
    log_warning "Cleaning up deployment..."
    kustomize build . | kubectl delete -f - --ignore-not-found=true
    log_success "Cleanup completed"
}

# Main deployment function
main() {
    log_info "Starting FOODMISSION Data Framework deployment..."
    
    case "${1:-deploy}" in
        "deploy")
            check_prerequisites
            create_namespace
            update_secrets
            deploy_application
            wait_for_deployment
            run_health_checks
            display_deployment_info
            log_success "Deployment completed successfully!"
            ;;
        "rollback")
            check_prerequisites
            rollback_deployment
            ;;
        "cleanup")
            check_prerequisites
            cleanup_deployment
            ;;
        "status")
            check_prerequisites
            display_deployment_info
            ;;
        *)
            echo "Usage: $0 {deploy|rollback|cleanup|status}"
            echo ""
            echo "Commands:"
            echo "  deploy   - Deploy the application (default)"
            echo "  rollback - Rollback to previous deployment"
            echo "  cleanup  - Remove all deployed resources"
            echo "  status   - Show deployment status"
            echo ""
            echo "Environment Variables:"
            echo "  IMAGE_TAG        - Docker image tag (default: latest)"
            echo "  ENVIRONMENT      - Deployment environment (default: production)"
            echo "  KUBECTL_CONTEXT  - Kubectl context to use"
            exit 1
            ;;
    esac
}

# Trap to handle script interruption
trap 'log_error "Script interrupted"; exit 1' INT TERM

# Run main function
main "$@"