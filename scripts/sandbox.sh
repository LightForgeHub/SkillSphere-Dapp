#!/usr/bin/env bash
set -euo pipefail

# Script to spin up a local Soroban node, deploy contracts, and fund test wallets

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${PROJECT_ROOT}/.env.sandbox"
CONTAINER_NAME="skillsphere-sandbox"
NETWORK_URL="http://localhost:8000"
FAUCET_URL="http://localhost:8000/faucet"
MAX_RETRIES=30
RETRY_INTERVAL=1

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Cleanup function for graceful shutdown
cleanup() {
    log_info "Shutting down sandbox..."
    docker stop "${CONTAINER_NAME}" 2>/dev/null || true
    docker rm "${CONTAINER_NAME}" 2>/dev/null || true
    if [[ -f "${ENV_FILE}" ]]; then
        rm -f "${ENV_FILE}"
    fi
    exit 0
}

# Trap SIGINT/SIGTERM
trap cleanup SIGINT SIGTERM

# Check for required tools
check_requirements() {
    local missing_tools=()

    if ! command -v soroban &> /dev/null; then
        missing_tools+=("soroban")
    fi

    if ! command -v stellar &> /dev/null; then
        missing_tools+=("stellar-cli")
    fi

    if ! command -v docker &> /dev/null; then
        missing_tools+=("docker")
    fi

    if [[ ${#missing_tools[@]} -gt 0 ]]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        log_error "Please install the missing tools and try again."
        exit 1
    fi

    log_info "All required tools found."
}

# Generate deterministic keypairs from fixed seeds
generate_keypairs() {
    log_info "Generating deterministic test keypairs..."

    # ALICE key - fixed seed for reproducibility
    ALICE_PUB=$(soroban keys generate --seed=27 Alice --show-address 2>/dev/null | grep "Public" | awk '{print $2}')
    ALICE_SEC=$(soroban keys generate --seed=27 Alice --show-secret-from-seed 2>/dev/null | grep "Secret" | awk '{print $2}')

    # BOB key - fixed seed for reproducibility
    BOB_PUB=$(soroban keys generate --seed=53 Bob --show-address 2>/dev/null | grep "Public" | awk '{print $2}')
    BOB_SEC=$(soroban keys generate --seed=53 Bob --show-secret-from-seed 2>/dev/null | grep "Secret" | awk '{print $2}')

    # ADMIN key - fixed seed for reproducibility
    ADMIN_PUB=$(soroban keys generate --seed=91 Admin --show-address 2>/dev/null | grep "Public" | awk '{print $2}')
    ADMIN_SEC=$(soroban keys generate --seed=91 Admin --show-secret-from-seed 2>/dev/null | grep "Secret" | awk '{print $2}')

    # Alternative deterministic generation using openssl and soroban keys parse
    if [[ -z "${ALICE_PUB}" ]]; then
        # Use explicit key generation for sandbox
        log_info "Using built-in key generation for test accounts..."
        ALICE_PUB=$(soroban keys generate --global Alice 2>/dev/null && soroban keys address Alice)
        ALICE_SEC=""
        BOB_PUB=$(soroban keys generate --global Bob 2>/dev/null && soroban keys address Bob)
        BOB_SEC=""
        ADMIN_PUB=$(soroban keys generate --global Admin 2>/dev/null && soroban keys address Admin)
        ADMIN_SEC=""
    fi
}

# Wait for node to be healthy
wait_for_node() {
    log_info "Waiting for Soroban node to be ready..."
    local retries=0

    while [[ $retries -lt $MAX_RETRIES ]]; do
        if curl -s "${NETWORK_URL}" > /dev/null 2>&1; then
            log_info "Soroban node is healthy!"
            return 0
        fi
        retries=$((retries + 1))
        sleep "${RETRY_INTERVAL}"
    done

    log_error "Node failed to start within $((MAX_RETRIES * RETRY_INTERVAL)) seconds"
    exit 1
}

# Start local Docker node
start_docker_node() {
    log_info "Starting local Soroban/Stellar standalone node..."

    # Stop existing container if running
    docker stop "${CONTAINER_NAME}" 2>/dev/null || true
    docker rm "${CONTAINER_NAME}" 2>/dev/null || true

    # Start the quickstart container
    docker run -d \
        --name "${CONTAINER_NAME}" \
        -p 8000:8000 \
        -p 11626:11626 \
        -e STELLAR_DOCKER_ARGS="--allow-input-expiration --limit-peer=1000" \
        stellar/quickstart:latest --standalone &

    wait_for_node
}

# Fund test accounts
fund_accounts() {
    log_info "Funding test accounts..."

    # Create friendbot funding requests
    curl -s "${FAUCET_URL}?${ALICE_PUB}" > /dev/null 2>&1 || true
    curl -s "${FAUCET_URL}?${BOB_PUB}" > /dev/null 2>&1 || true
    curl -s "${FAUCET_URL}?${ADMIN_PUB}" > /dev/null 2>&1 || true

    log_info "Accounts funded via friendbot."
}

# Build all contracts
build_contracts() {
    log_info "Building contracts..."
    cd "${PROJECT_ROOT}/contracts"
    cargo build --target wasm32-unknown-unknown --release
    cd "${PROJECT_ROOT}"
    log_info "Contracts built successfully."
}

# Deploy contracts and capture IDs
deploy_contracts() {
    log_info "Deploying contracts..."

    soroban network add --global sandbox local "${NETWORK_URL}"

    # Find all wasm files in target directory
    CONTRACT_IDS=()
    CONTRACT_NAMES=()

    while IFS= read -r wasm_file; do
        if [[ -n "${wasm_file}" ]]; then
            CONTRACT_NAME=$(basename "${wasm_file}" .wasm)
            CONTRACT_NAMES+=("${CONTRACT_NAME}")

            DEPLOY_OUTPUT=$(soroban contract deploy \
                --source Alice \
                --wasm "${wasm_file}" \
                --network sandbox 2>&1)

            CONTRACT_ID=$(echo "${DEPLOY_OUTPUT}" | tail -1)
            if [[ -n "${CONTRACT_ID}" ]]; then
                CONTRACT_IDS+=("${CONTRACT_ID}")
                log_info "Deployed ${CONTRACT_NAME}: ${CONTRACT_ID}"
            fi
        fi
    done < <(find "${PROJECT_ROOT}/target/wasm32-unknown-unknown/release" -name "*.wasm" -type f 2>/dev/null)

    log_info "All contracts deployed."
}

# Write environment file
write_env_file() {
    log_info "Writing .env.sandbox file..."

    {
        echo "# SkillSphere Sandbox Environment"
        echo "# Generated on $(date -Iseconds)"
        echo ""
        echo "# Network Configuration"
        echo "SOROBAN_NETWORK=sandbox"
        echo "SOROBAN_RPC_URL=${NETWORK_URL}"
        echo ""
        echo "# Test Accounts (Public Keys)"
        echo "ALICE_PUBLIC_KEY=${ALICE_PUB}"
        echo "BOB_PUBLIC_KEY=${BOB_PUB}"
        echo "ADMIN_PUBLIC_KEY=${ADMIN_PUB}"
        echo ""
        echo "# Test Accounts (Secret Keys - use with caution)"
        echo "ALICE_SECRET_KEY=${ALICE_SEC}"
        echo "BOB_SECRET_KEY=${BOB_SEC}"
        echo "ADMIN_SECRET_KEY=${ADMIN_SEC}"
        echo ""
        echo "# Deployed Contracts"
        for i in "${!CONTRACT_NAMES[@]}"; do
            echo "${CONTRACT_NAMES[$i]^^}_CONTRACT_ID=${CONTRACT_IDS[$i]}"
        done
    } > "${ENV_FILE}"

    log_info "Environment file written to ${ENV_FILE}"
}

# Print summary table
print_summary() {
    echo ""
    echo "========================================"
    echo "   SkillSphere Sandbox Summary"
    echo "========================================"
    echo ""
    echo "Network: Sandbox (local)"
    echo "RPC URL: ${NETWORK_URL}"
    echo ""
    echo "--- Funded Accounts ---"
    printf "  %-12s %s\n" "Alice:" "${ALICE_PUB}"
    printf "  %-12s %s\n" "Bob:" "${BOB_PUB}"
    printf "  %-12s %s\n" "Admin:" "${ADMIN_PUB}"
    echo ""
    echo "--- Deployed Contracts ---"
    for i in "${!CONTRACT_NAMES[@]}"; do
        printf "  %-20s %s\n" "${CONTRACT_NAMES[$i]}:" "${CONTRACT_IDS[$i]}"
    done
    echo ""
    echo "========================================"
}

# Main execution
main() {
    log_info "Starting SkillSphere sandbox setup..."

    check_requirements
    generate_keypairs
    start_docker_node
    fund_accounts
    build_contracts
    deploy_contracts
    write_env_file
    print_summary

    log_info "Sandbox is running. Press Ctrl+C to stop."
    # Keep script running to maintain container
    wait
}

main "$@"