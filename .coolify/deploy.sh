#!/bin/bash
# Script de deploy customizado para Coolify

# Usar docker compose v2 (sem hífen)
docker compose build --no-cache
docker compose up -d