# ============================================
# Stage 1: Backend build
# ============================================
FROM eclipse-temurin:17-jdk AS backend-build
WORKDIR /build
COPY backend/ .
RUN chmod +x gradlew && ./gradlew bootJar -x test --no-daemon

# ============================================
# Stage 2: Frontend build
# ============================================
FROM node:20-slim AS frontend-build
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# ============================================
# Stage 3: Runtime
# ============================================
FROM eclipse-temurin:17-jre

# Install Node.js + supervisord
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl supervisor && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Backend
COPY --from=backend-build /build/build/libs/*.jar app.jar

# Frontend
COPY --from=frontend-build /build/.next .next/
COPY --from=frontend-build /build/public public/
COPY --from=frontend-build /build/node_modules node_modules/
COPY --from=frontend-build /build/package.json .
COPY --from=frontend-build /build/next.config.js .

# Supervisord config
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

EXPOSE 3000

CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]