#!/bin/bash

echo "🚀 Abrindo Prisma Studio..."
echo "📊 Acesse: http://localhost:5555"
echo "⏹️  Para parar: Ctrl+C"
echo ""

docker compose exec api npx prisma studio --hostname 0.0.0.0 --port 5555
