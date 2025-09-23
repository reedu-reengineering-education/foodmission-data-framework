#!/bin/bash

# Kubernetes Secrets Management Script for FoodMission Data Framework
# This script helps manage Kubernetes secrets securely

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
K8S_DIR="$SCRIPT_DIR/../k8s"
SECRETS_FILE="$K8S_DIR/secrets.yaml"
TEMPLATE_FILE="$K8S_DIR/secrets.template.yaml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_usage() {
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  create-from-template  Create secrets.yaml from template"
    echo "  apply                 Apply secrets to Kubernetes cluster"
    echo "  create-sealed         Create sealed secrets (requires kubeseal)"
    echo "  base64-encode         Encode a string to base64"
    echo "  help                  Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 create-from-template"
    echo "  $0 base64-encode 'my-secret-password'"
    echo "  $0 apply"
}

base64_encode() {
    if [ -z "$1" ]; then
        echo -e "${RED}Error: Please provide a string to encode${NC}"
        echo "Usage: $0 base64-encode 'your-secret-string'"
        exit 1
    fi
    echo -n "$1" | base64
}

create_from_template() {
    if [ ! -f "$TEMPLATE_FILE" ]; then
        echo -e "${RED}Error: Template file not found: $TEMPLATE_FILE${NC}"
        exit 1
    fi

    if [ -f "$SECRETS_FILE" ]; then
        echo -e "${YELLOW}Warning: secrets.yaml already exists${NC}"
        read -p "Do you want to overwrite it? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Aborted."
            exit 0
        fi
    fi

    cp "$TEMPLATE_FILE" "$SECRETS_FILE"
    echo -e "${GREEN}Created $SECRETS_FILE from template${NC}"
    echo -e "${YELLOW}Remember to replace all placeholder values with actual base64-encoded secrets!${NC}"
    echo ""
    echo "Use: $0 base64-encode 'your-secret' to encode values"
}

apply_secrets() {
    if [ ! -f "$SECRETS_FILE" ]; then
        echo -e "${RED}Error: secrets.yaml not found. Run 'create-from-template' first.${NC}"
        exit 1
    fi

    # Check if file still contains placeholders
    if grep -q "<BASE64_ENCODED_" "$SECRETS_FILE"; then
        echo -e "${RED}Error: secrets.yaml still contains placeholder values!${NC}"
        echo "Please replace all <BASE64_ENCODED_*> placeholders with actual base64-encoded values."
        echo "Use: $0 base64-encode 'your-secret' to encode values"
        exit 1
    fi

    echo "Applying secrets to Kubernetes cluster..."
    kubectl apply -f "$SECRETS_FILE"
    echo -e "${GREEN}Secrets applied successfully!${NC}"
}

create_sealed_secrets() {
    if ! command -v kubeseal &> /dev/null; then
        echo -e "${RED}Error: kubeseal is not installed${NC}"
        echo "Install it with:"
        echo "  brew install kubeseal  # macOS"
        echo "  # or download from: https://github.com/bitnami-labs/sealed-secrets/releases"
        exit 1
    fi

    echo "Creating sealed secrets..."
    echo "Please enter the secret values (they will be encrypted):"
    
    read -s -p "Database Password: " db_password
    echo
    read -s -p "Redis Password: " redis_password
    echo
    read -s -p "Keycloak Client Secret: " keycloak_secret
    echo
    read -s -p "OpenFoodFacts API Key: " api_key
    echo
    read -s -p "Encryption Key: " encryption_key
    echo

    kubectl create secret generic foodmission-secrets \
        --namespace=foodmission \
        --from-literal=DATABASE_PASSWORD="$db_password" \
        --from-literal=REDIS_PASSWORD="$redis_password" \
        --from-literal=KEYCLOAK_CLIENT_SECRET="$keycloak_secret" \
        --from-literal=OPENFOODFACTS_API_KEY="$api_key" \
        --from-literal=ENCRYPTION_KEY="$encryption_key" \
        --dry-run=client -o yaml | \
        kubeseal -o yaml > "$K8S_DIR/sealed-secrets.yaml"

    echo -e "${GREEN}Sealed secrets created: $K8S_DIR/sealed-secrets.yaml${NC}"
    echo "You can now safely commit this file to Git!"
}

# Main script logic
case "${1:-help}" in
    "create-from-template")
        create_from_template
        ;;
    "apply")
        apply_secrets
        ;;
    "create-sealed")
        create_sealed_secrets
        ;;
    "base64-encode")
        base64_encode "$2"
        ;;
    "help"|*)
        print_usage
        ;;
esac