# Use an official Node-RED image as base
FROM nodered/node-red:latest
# Find your host UID/GID and replace 1000:1000 below
ARG USER_UID=1000
ARG USER_GID=1000
# Switch to root user to perform installation and updates
USER root

# Expose port 1880 for the web interface
EXPOSE 1880