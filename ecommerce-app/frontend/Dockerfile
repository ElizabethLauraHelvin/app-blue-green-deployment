
FROM nginx:1.27-alpine

# Remove default Nginx configuration
RUN rm -f /etc/nginx/conf.d/default.conf

# Copy Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy proxy configuration
COPY proxy_params /etc/nginx/proxy_params

# Copy frontend application
COPY index.html admin.html app.js admin.js style.css /usr/share/nginx/html/

# Expose HTTP port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s \
    CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
