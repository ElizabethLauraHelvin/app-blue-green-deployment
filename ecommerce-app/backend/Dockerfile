
FROM node:20-slim

WORKDIR /app

# Environment configuration
ENV NODE_ENV=production
ENV PORT=3000
ENV DB_FILE=/data/shop.db
ENV UPLOAD_DIR=/data/uploads

# Copy dependency definitions
COPY package.json package-lock.json ./

# Install production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy backend source code
COPY src ./src

# Prepare persistent data directory
RUN mkdir -p /data/uploads \
    && chown -R node:node /app /data

# Run as non-root user
USER node

# Application port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
    CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/index.js"]
