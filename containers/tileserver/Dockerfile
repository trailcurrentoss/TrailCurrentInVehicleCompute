# TrailCurrent custom tile server — serves vector tiles with project styles and fonts
FROM maptiler/tileserver-gl:latest

# Copy configuration
COPY config.json /config.json

# Copy styles, fonts, and sprites to /data
COPY styles /data/styles
COPY fonts /data/fonts
COPY sprites /data/sprites

# Copy corrected healthcheck script (base image hardcodes port 8080, we use 80)
COPY healthcheck.js /usr/src/app/src/healthcheck.js

# Expose port 80 (matches what frontend nginx proxies to)
EXPOSE 80

CMD ["--config", "/config.json", "-p", "80"]
