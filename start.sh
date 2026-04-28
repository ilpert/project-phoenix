#!/usr/bin/env bash
docker context use colima && docker-compose down --remove-orphans && docker-compose up --build -d && echo "" && echo "Stack live:" && echo "  Frontend  → http://localhost:5173" && echo "  API       → http://localhost:3001" && echo "  Gateway   → http://localhost" && echo "  Legacy    → http://localhost:8080" && echo "" && docker-compose ps
