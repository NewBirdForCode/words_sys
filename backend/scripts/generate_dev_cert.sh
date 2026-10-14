#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p certs
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout certs/dev-key.pem \
  -out certs/dev-cert.pem \
  -days 365 \
  -subj "/C=CN/ST=Local/L=Local/O=words_sys/OU=Development/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
chmod 600 certs/dev-key.pem
printf 'Generated %s and %s\n' certs/dev-cert.pem certs/dev-key.pem
