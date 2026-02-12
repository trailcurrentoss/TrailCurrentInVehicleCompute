FROM node:18-alpine as maplibre-downloader

# Download MapLibre GL JS and CSS files (version 4.7.1)
RUN mkdir -p /maplibre && \
    cd /maplibre && \
    npm init -y && \
    npm install maplibre-gl@4.7.1 && \
    # Copy JS file
    cp node_modules/maplibre-gl/dist/maplibre-gl.js maplibre-gl.js && \
    # Copy CSS file
    cp node_modules/maplibre-gl/dist/maplibre-gl.css maplibre-gl.css

FROM nginx:alpine

COPY nginx.conf /etc/nginx/nginx.conf
COPY public /usr/share/nginx/html

# Copy MapLibre GL files from downloader stage
COPY --from=maplibre-downloader /maplibre/maplibre-gl.js /usr/share/nginx/html/libs/maplibre/
COPY --from=maplibre-downloader /maplibre/maplibre-gl.css /usr/share/nginx/html/libs/maplibre/

EXPOSE 443

CMD ["nginx", "-g", "daemon off;"]
