# Use an official Mosquitto image as base
FROM eclipse-mosquitto:latest

# Run entrypoint as root so it can write the passwd file
USER root
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["-c", "/mosquitto/config/mosquitto.conf"]
