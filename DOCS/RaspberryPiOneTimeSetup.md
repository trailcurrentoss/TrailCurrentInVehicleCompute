# Raspberry Pi One-Time Setup

This guide walks through setting up a **brand new Raspberry Pi** to run TrailCurrent. These steps are performed once per device. After this, all future updates are handled by the deployment package (`deploy.sh`).

---

## Prerequisites

### Flash the SD Card

Download and install **Raspberry Pi Imager v2.0.6 or newer**. Older versions (1.9.x and below) will silently fail to apply OS customisation settings on Trixie-based images.

> **Important:** As of early 2026, neither apt (ships 1.8.5) nor snap (ships 1.9.6) provide a new enough version. Download v2.0.6+ directly from the [GitHub releases page](https://github.com/raspberrypi/rpi-imager/releases):
>
> - **Windows** — `imager-v2.0.6.exe`
> - **macOS** — `rpi-imager-v2.0.6.dmg`
> - **Linux (deb)** — `rpi-imager_2.0.6_amd64.deb`, then install with `sudo apt install ./rpi-imager_2.0.6_amd64.deb` (using `apt` instead of `dpkg` ensures dependencies are resolved automatically; if the download fails with a `dpkg-deb` error, re-download the file — it was likely truncated)
> - **Linux (AppImage)** — `Raspberry_Pi_Imager-v2.0.6-desktop-x86_64.AppImage`, then `chmod +x` and run directly

Insert the SD card into your development machine and launch the Imager.

**1. Choose Device** — Click the **CHOOSE DEVICE** button and select your Raspberry Pi model (Pi 4 or Pi 5).

![Pi Imager - Choose Device button](IMGS/pi_imager_choose_device.png)


**2. Choose OS** — Click the **CHOOSE OS** button.

Select **Raspberry Pi OS (other)** to see additional options.

![Pi Imager OS selection - other](IMGS/pi_imager_os_other.png)

Then select **Raspberry Pi OS Lite (64-bit)**. This is the headless version with no desktop environment.

![Pi Imager OS selection - Lite](IMGS/pi_imager_os_lite.png)

**3. Choose Storage** — Click the **CHOOSE STORAGE** button and select your SD card.

![Pi Imager - Choose Storage button](IMGS/pi_imager_choose_storage.png)

![Pi Imager storage selection](IMGS/pi_imager_sd_select.png)

**4. Configure OS Settings** — Click the **NEXT** button.

![Pi Imager - Next button](IMGS/pi_imager_next.png)

Pi Imager will ask to apply OS customisation settings. Click **EDIT SETTINGS** to configure them.
![Pi Imager - Edit Settings](IMGS/pi_imager_edit_settings.png)

**General tab** — Set the hostname, username, password, WiFi SSID/password, and locale. WiFi is required for SSH access, deployment transfers, and the web UI.

![Pi Imager Host Name](IMGS/pi_imager_hostname.png)

**Services tab** — Enable SSH with password authentication.

![Pi Imager Services settings](IMGS/pi_imager_services.png)

**Options tab** — Uncheck **"Eject media when finished"** so the SD card stays mounted for the SSH verification step below. Click **SAVE**

![Pi Imager Options settings](IMGS/pi_imager_options.png)

**5. Flash** — When prompted to apply OS customisation settings, click **YES** to begin flashing.

![Pi Imager customisation prompt](IMGS/pi_imager_confirm.png)

### Verify First-Boot Customisation

After flashing, verify Pi Imager applied your customisation settings. Mount the boot partition:

- **Linux** — the SD card is not mounted after flashing. Remove it and re-insert it so the `bootfs` partition mounts automatically (typically at `/media/<user>/bootfs/`).
- **macOS** — the boot partition usually auto-mounts at `/Volumes/bootfs/`.
- **Windows** — the boot partition appears as a drive letter in File Explorer (e.g. `D:\`).

Open the `user-data` file in a text editor and verify it contains **uncommented** configuration — not just the default template. If Pi Imager applied settings correctly, you will see active (non-commented) lines for `hostname`, `users`, `ssh_pwauth`, etc.

If the file contains only comments (lines starting with `#`), your Pi Imager version is too old. Update to v2.0.6+ and re-flash.

Safely eject the SD card after confirming `user-data` has active configuration.

### Hardware

- Raspberry Pi 4 or 5 (8GB RAM recommended)
- TrailCurrent Pi Hat (plugs directly onto the GPIO header)
- microSD card (32GB+) or NVME Drive via NVME Base

---

## Step 1: Insert the SD Card

Insert the flashed SD card into the Pi's microSD slot.

---

## Step 2: Install the TrailCurrent CAN Hat

With the Pi powered off, install the SD Card, and the TrailCurrent CAN Hat onto the Pi 5 GPIO header.

![TrailCurrent CAN Hat installed on Pi — bottom view](IMGS/can_hat_bottom_view.jpg)

![TrailCurrent CAN Hat installed on Pi — top view](IMGS/can_hat_top_view.jpg)


Connect the JST XH 4-pin cable (JST S4B-XH-SM4-TB) to the hat. The pinout from left to right is:

![JST XH 4-pin connector pinout](IMGS/jst_xh_4pin_pinout.png)

> **WARNING:** There is no reverse polarity protection on this circuit. Incorrect wiring will damage the Pi. Double-check the pinout before applying power.

---

## Step 3: Connect to the Network

Plug the Pi into an available LAN port on your WiFi router using an Ethernet cable.

---

## Step 4: Boot the Pi

Connect power to the Pi so that it boots.

---

## Step 5: Get the Setup Script onto the Pi

SSH in:

```bash
ssh <username>@<pi-ip-address>
```

Transfer the `rpi_one_time` folder from this repository to the Pi. For example, from your development machine:

```bash
scp -r rpi_one_time/ <username>@<pi-ip-address>:~/
```

---

## Step 6: Run the Setup Script

```bash
cd ~/rpi_one_time
sudo ./setup-pi.sh
```

The script installs and configures everything automatically:

| Step | What it does |
|------|-------------|
| 1 | Updates system packages (`apt-get update && upgrade`) |
| 2 | Installs dependencies: `jq`, `openssl`, `python3`, `python3-venv`, `can-utils`, `avahi`, `curl`, `unzip` |
| 3 | Installs Docker and Docker Compose plugin, enables on boot |
| 4 | Enables SPI interface via `raspi-config` |
| 5 | Adds MCP2515 CAN bus overlay to boot config (12MHz oscillator, GPIO25 interrupt) |
| 6 | Configures `can0` network interface to auto-start at 500kbps |
| 7 | Adds your user to the `docker` group |
| 8 | Configures auto-boot on power — Pi 5 only (no power button needed in vehicle) |
| 9 | Creates Python virtual environment at `~/local_code/cantomqtt` |
| 10 | Installs and enables the `cantomqtt` systemd service |
| 11 | Creates the deployment directory structure at `~/trailcurrent/` |
| 12 | Generates TLS/SSL certificates using the Pi's hostname (10-year validity) |

---

## Step 7: Reboot

A reboot is required for SPI and the CAN overlay to take effect:

```bash
sudo reboot
```

---

## Step 8: Verify

After the Pi comes back up, SSH in and verify:

```bash
# SPI device files should exist
ls /dev/spidev0.*

# CAN interface should be UP
ip link show can0

# Docker should be running
docker --version
docker compose version
```

If `can0` shows `state UP`, the hardware and driver are working.

---

## Step 9: Transfer Map Tiles

The map tiles file **must** be in place before running `deploy.sh`. If it is missing, Docker will create a root-owned directory at the mount point, which breaks the tileserver and requires manual cleanup (`sudo rm -rf ~/trailcurrent/data/tileserver/us-tiles.mbtiles` then re-create as a file).

From your development machine:

```bash
scp us-tiles.mbtiles <username>@<hostname>.local:~/trailcurrent/data/tileserver/us-tiles.mbtiles
```

The `~/trailcurrent/data/tileserver/` directory was already created by the setup script. See [UpdatingMapTiles.md](UpdatingMapTiles.md) for how to obtain or generate this file.

---

## Next Steps

Your Pi is now ready for application deployment:

1. **Create a deployment package** on your development machine (see [PI_DEPLOYMENT.md](../PI_DEPLOYMENT.md)):
   ```bash
   ./create-deployment-package.sh --version=1.0.0
   ```

2. **Transfer the zip to the Pi**:
   ```bash
   scp trailcurrent-deployment-1.0.0.zip <username>@<hostname>.local:~/trailcurrent/
   ```

3. **Deploy**:
   ```bash
   cd ~/trailcurrent
   unzip trailcurrent-deployment-1.0.0.zip
   ./deploy.sh
   ```

On first run, `deploy.sh` will prompt you to configure `.env` with your credentials. TLS certificates were already generated during setup using the Pi's hostname. See [PI_DEPLOYMENT.md](../PI_DEPLOYMENT.md) for the full deployment walkthrough.

---

## Reference

| Document | Purpose |
|----------|---------|
| [PI_DEPLOYMENT.md](../PI_DEPLOYMENT.md) | Deploying and updating the application |
| [PiSetup.md](PiSetup.md) | Application-level configuration (env, certs, tiles) |
| [UpdatingMapTiles.md](UpdatingMapTiles.md) | Generating and updating map tile data |
