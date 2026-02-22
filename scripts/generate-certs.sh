#!/bin/bash

################################################################################
# TrailCurrent SSL Certificate Generation Script
#
# This script generates self-signed SSL certificates for development and
# production environments with appropriate Subject Alternative Names (SANs).
#
# DEVELOPMENT MODE: Creates certificates with localhost, 127.0.0.1, ::1, and hostname
# PRODUCTION MODE: Creates certificates with hostname, 127.0.0.1, and ::1
#
# Security: All generated certificates are protected by .gitignore patterns
# (.key, .pem, .crt files and data/ directory)
#
# USAGE:
#   Interactive mode (prompts for selection):
#     ./scripts/generate-certs.sh
#
#   Non-interactive mode (specify mode as argument):
#     ./scripts/generate-certs.sh 1    # Generate development certificates
#     ./scripts/generate-certs.sh 2    # Generate production certificates
#
#   Or use environment variable:
#     CERT_MODE=2 ./scripts/generate-certs.sh
#
# Requirements:
#   - .env file must exist with TLS_CERT_HOSTNAME set
#   - OpenSSL must be installed
#   - For production mode: TLS_CERT_HOSTNAME should match your device hostname
################################################################################

# Check and prevent errors from quitting script during heredoc
set -o pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/.env"
KEYS_DIR="$PROJECT_ROOT/data/keys"

# Certificate validity
CA_VALIDITY_DAYS=3650        # 10 years for CA
SERVER_VALIDITY_DAYS=825     # Apple requires server certs <= 825 days

################################################################################
# Functions
################################################################################

print_header() {
    echo ""
    echo "========================================"
    echo "$1"
    echo "========================================"
    echo ""
}

print_success() {
    echo "✓ $1"
}

print_error() {
    echo "✗ $1" >&2
}

print_warning() {
    echo "⚠ $1"
}

print_info() {
    echo "ℹ $1"
}

print_usage() {
    echo "Usage: $0 [MODE] [OPTIONS]"
    echo ""
    echo "MODE (optional):"
    echo "  1              Generate development certificates (interactive if omitted)"
    echo "  2              Generate production certificates"
    echo "  -h, --help     Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0              # Interactive mode - prompts for mode selection"
    echo "  $0 1            # Generate development certs without prompts"
    echo "  $0 2            # Generate production certs without prompts"
    echo "  CERT_MODE=2 $0  # Use environment variable instead"
    echo ""
    echo "Requirements:"
    echo "  - .env file must exist in project root"
    echo "  - TLS_CERT_HOSTNAME must be set in .env"
    echo "  - OpenSSL must be installed"
    echo ""
}

check_requirements() {
    if ! command -v openssl &> /dev/null; then
        print_error "OpenSSL is not installed. Please install OpenSSL and try again."
        exit 1
    fi

    if [ ! -f "$ENV_FILE" ]; then
        print_error ".env file not found"
        exit 1
    fi

    print_success "OpenSSL found"
    print_success ".env file found"
}

load_config() {
    HOSTNAME=$(grep -E "^TLS_CERT_HOSTNAME=" "$ENV_FILE" | cut -d'=' -f2 | xargs)

    if [ -z "$HOSTNAME" ]; then
        print_error "TLS_CERT_HOSTNAME not set in .env"
        exit 1
    fi

    print_success "Loaded TLS_CERT_HOSTNAME: $HOSTNAME"
}

verify_gitignore() {
    print_info "Checking .gitignore protection..."

    if grep -q '^\*\.key$' "$PROJECT_ROOT/.gitignore" && \
       grep -q '^\*\.pem$' "$PROJECT_ROOT/.gitignore" && \
       grep -q '^\*\.crt$' "$PROJECT_ROOT/.gitignore" && \
       grep -q '^data/$' "$PROJECT_ROOT/.gitignore"; then
        print_success ".gitignore has complete certificate protection"
    else
        print_warning "Some .gitignore patterns may be missing"
    fi
}

create_keys_dir() {
    mkdir -p "$KEYS_DIR"
}

get_cert_mode() {
    # Check if passed as argument or env var
    local mode="${1:-${CERT_MODE:-}}"

    if [ -z "$mode" ]; then
        print_header "Certificate Generation Mode"
        echo "Choose certificate type:"
        echo ""
        echo "  (1) DEVELOPMENT - localhost/127.0.0.1 (local testing)"
        echo "  (2) PRODUCTION  - hostname-based (remote deployment)"
        echo ""
        read -p "Enter mode (1 or 2): " mode
    fi

    case $mode in
        1)
            CERT_MODE="development"
            CN="localhost"
            print_success "Selected: DEVELOPMENT mode"
            ;;
        2)
            CERT_MODE="production"
            CN="$HOSTNAME"
            print_success "Selected: PRODUCTION mode"
            ;;
        *)
            print_error "Invalid selection"
            exit 1
            ;;
    esac
}

detect_local_ips() {
    # Detect non-loopback IPv4 addresses on this device
    local ips=""
    if command -v hostname >/dev/null 2>&1; then
        ips=$(hostname -I 2>/dev/null | tr ' ' '\n' | grep -E '^[0-9]+\.' | grep -v '^127\.' || true)
    fi
    if [ -z "$ips" ] && command -v ifconfig >/dev/null 2>&1; then
        ips=$(ifconfig 2>/dev/null | grep 'inet ' | grep -v '127.0.0.1' | awk '{print $2}' | sed 's/addr://' || true)
    fi
    echo "$ips"
}

build_san_list() {
    # Start with base SANs
    case $CERT_MODE in
        development)
            SAN_LIST="DNS:localhost,IP:127.0.0.1,IP:::1,DNS:$HOSTNAME"
            ;;
        production)
            SAN_LIST="DNS:$HOSTNAME,IP:127.0.0.1,IP:::1"
            ;;
    esac

    # Auto-detect and add local network IP addresses
    local local_ips
    local_ips=$(detect_local_ips)
    if [ -n "$local_ips" ]; then
        while IFS= read -r ip; do
            if [ -n "$ip" ] && [ "$ip" != "127.0.0.1" ]; then
                SAN_LIST="$SAN_LIST,IP:$ip"
                print_success "Added local IP to certificate: $ip"
            fi
        done <<< "$local_ips"
    fi

    print_info "Common Name: $CN"
    print_info "SANs: $SAN_LIST"
}

backup_existing() {
    if [ -f "$KEYS_DIR/server.crt" ] || [ -f "$KEYS_DIR/server.key" ]; then
        print_warning "Existing certificates found"
        BACKUP_DIR="$KEYS_DIR/backup_$(date +%Y%m%d_%H%M%S)"
        mkdir -p "$BACKUP_DIR"
        cp "$KEYS_DIR"/*.{key,crt,pem} "$BACKUP_DIR/" 2>/dev/null || true
        print_success "Backed up to: $BACKUP_DIR"
    fi
}

generate_certs() {
    print_header "Generating Certificates"

    # Generate CA key if it doesn't exist
    if [ ! -f "$KEYS_DIR/ca.key" ]; then
        print_info "Generating CA key..."
        openssl genrsa -out "$KEYS_DIR/ca.key" 2048 2>/dev/null
        chmod 644 "$KEYS_DIR/ca.key"
        print_success "CA key created"
    else
        print_info "Using existing CA key"
    fi

    # Generate CA certificate (reuse existing so devices don't need to re-install)
    if [ ! -f "$KEYS_DIR/ca.crt" ]; then
        print_info "Generating CA certificate..."

        # Use config file for extensions (works on all OpenSSL versions)
        cat > "$KEYS_DIR/_ca.cnf" <<'CAEOF'
[req]
distinguished_name = req_dn
x509_extensions = v3_ca
prompt = no

[req_dn]
C = US
ST = State
L = City
O = TrailCurrent
OU = Engineering
CN = TrailCurrent-CA

[v3_ca]
basicConstraints = critical, CA:true
keyUsage = critical, keyCertSign, cRLSign
subjectKeyIdentifier = hash
CAEOF

        openssl req -new -x509 -days $CA_VALIDITY_DAYS \
            -key "$KEYS_DIR/ca.key" \
            -out "$KEYS_DIR/ca.crt" \
            -config "$KEYS_DIR/_ca.cnf"

        if [ $? -ne 0 ]; then
            print_error "Failed to generate CA certificate"
            rm -f "$KEYS_DIR/_ca.cnf"
            exit 1
        fi

        chmod 644 "$KEYS_DIR/ca.crt"
        cp "$KEYS_DIR/ca.crt" "$KEYS_DIR/ca.pem"
        rm -f "$KEYS_DIR/_ca.cnf"
        print_success "CA certificate created"
    else
        print_info "Using existing CA certificate (devices don't need to re-install)"
    fi

    # Generate server key
    print_info "Generating server key..."
    openssl genrsa -out "$KEYS_DIR/server.key" 2048 2>/dev/null
    chmod 644 "$KEYS_DIR/server.key"
    print_success "Server key created"

    # Build server extension config file
    # Uses -config and -extfile instead of -addext/-copy_extensions
    # which require OpenSSL 3.0+ and silently fail on older versions
    print_info "Generating server certificate..."

    cat > "$KEYS_DIR/_server.cnf" <<SRVEOF
[req]
distinguished_name = req_dn
req_extensions = v3_server
prompt = no

[req_dn]
C = US
ST = State
L = City
O = TrailCurrent
OU = Engineering
CN = $CN

[v3_server]
basicConstraints = critical, CA:false
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = $SAN_LIST
SRVEOF

    openssl req -new \
        -key "$KEYS_DIR/server.key" \
        -out "$KEYS_DIR/server.csr" \
        -config "$KEYS_DIR/_server.cnf"

    if [ $? -ne 0 ]; then
        print_error "Failed to generate CSR"
        rm -f "$KEYS_DIR/_server.cnf"
        exit 1
    fi
    print_success "Signing request created"

    # Sign with -extfile to apply extensions (works on all OpenSSL versions)
    print_info "Signing certificate (valid $SERVER_VALIDITY_DAYS days)..."
    openssl x509 -req -days $SERVER_VALIDITY_DAYS \
        -in "$KEYS_DIR/server.csr" \
        -CA "$KEYS_DIR/ca.crt" \
        -CAkey "$KEYS_DIR/ca.key" \
        -CAcreateserial \
        -out "$KEYS_DIR/server.crt" \
        -extfile "$KEYS_DIR/_server.cnf" \
        -extensions v3_server

    if [ $? -ne 0 ]; then
        print_error "Failed to sign server certificate"
        rm -f "$KEYS_DIR/_server.cnf"
        exit 1
    fi

    chmod 644 "$KEYS_DIR/server.crt"
    rm -f "$KEYS_DIR/_server.cnf"
    print_success "Certificate signed"

    # Cleanup
    rm -f "$KEYS_DIR/server.csr" "$KEYS_DIR/ca.srl"
}

display_cert_info() {
    print_header "Certificate Information"

    echo "Certificate details:"
    openssl x509 -in "$KEYS_DIR/server.crt" -noout -subject -dates | sed 's/^/  /'
    echo ""
    echo "Subject Alternative Names:"
    openssl x509 -in "$KEYS_DIR/server.crt" -noout -text | grep -A 2 "Subject Alternative Name" | sed 's/^/  /'
}

display_next_steps() {
    print_header "Next Steps"

    case $CERT_MODE in
        development)
            echo "1. Start Docker services:"
            echo "   docker-compose up -d"
            echo ""
            echo "2. Access web interfaces:"
            echo "   https://localhost         - Frontend"
            echo "   https://localhost:8443    - Node-RED"
            echo "   https://127.0.0.1         - Frontend (IP)"
            echo "   https://127.0.0.1:8443    - Node-RED (IP)"
            echo ""
            echo "3. Accept self-signed certificate warning (one-time)"
            echo ""
            ;;
        production)
            echo "1. Install CA certificate on accessing devices (one-time):"
            echo "   File: data/keys/ca.crt"
            echo ""
            echo "2. Restart services to use the new certificate:"
            echo "   docker compose down && docker compose up -d --no-build"
            echo ""
            echo "3. Access from network:"
            echo "   https://$HOSTNAME"
            echo "   mqtts://$HOSTNAME:8883"
            echo ""
            echo "Note: CA cert is valid for 10 years. Server cert is valid"
            echo "for ~2 years (825 days, required by Apple/iOS). When the"
            echo "server cert expires, re-run this script — the CA stays the"
            echo "same so devices don't need to re-install the CA certificate."
            echo ""
            ;;
    esac

    print_warning "SECURITY REMINDER"
    echo "Certificates are protected by .gitignore"
    echo "NEVER commit generated certificates!"
    echo ""
}

################################################################################
# Main
################################################################################

main() {
    # Handle help flag
    if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
        print_usage
        exit 0
    fi

    print_header "TrailCurrent SSL Certificate Generator"

    # Run checks and setup
    check_requirements
    load_config
    verify_gitignore
    create_keys_dir

    # Get mode (support both interactive, argument, and environment variable)
    if [ -n "$1" ]; then
        get_cert_mode "$1"
    elif [ -n "$CERT_MODE" ]; then
        get_cert_mode "$CERT_MODE"
    else
        get_cert_mode
    fi

    # Build SANs
    build_san_list

    # Backup existing
    backup_existing

    # Generate
    generate_certs

    # Display info
    display_cert_info
    display_next_steps
}

main "$@"
