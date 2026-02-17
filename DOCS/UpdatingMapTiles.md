# Generating and Updating Map Tiles

> **Note**: Map tile setup is a **ONE-TIME task** during initial device deployment. This document describes how to generate or update tiles, which should be done **rarely** (e.g., once per year for map updates).
>
> For initial setup on a new device, see [PiSetup.md](PiSetup.md).

This guide explains how to generate mbtiles map data for use with the Tileserver container.

## Overview

Tileserver requires a `.mbtiles` file that contains map tile data. This file is a SQLite database containing pre-rendered map tiles at various zoom levels.

You have several options:
1. **Download pre-generated tiles** from a tile server (easiest)
2. **Generate tiles from OpenStreetMap data** (most control)
3. **Use existing mbtiles** from another source

## Option 1: Download Pre-generated Tiles (Easiest)

Many projects provide pre-generated mbtiles files for different regions:

### Public Tile Sources
- **Natural Earth Data**: Free, global coverage at multiple scales
- **OpenStreetMap Community**: Various pre-rendered tile sets
- **Maps.me**: Extract offline maps as mbtiles

### Steps
1. Download a suitable mbtiles file for your region
2. Place it in `data/tileserver/map.mbtiles`
3. Start the application: `docker-compose up -d`

## Option 2: Generate Tiles from OpenStreetMap Data

### Prerequisites
- Linux/macOS system or Docker
- `osmium` (for filtering OSM data)
- `tippecanoe` (for rendering tiles)
- Or use Docker containers with these tools pre-installed

### Data Sources
- **OpenStreetMap Planet Extracts**: https://download.geofabrik.de/
- **BBBike**: https://extract.bbbike.org/ (web-based extracts)
- **Overpass API**: For specific queries

### Basic Workflow

#### Step 1: Get OpenStreetMap Data
Download a `.osm.pbf` file (protobuf format) for your region:

```bash
# Example: Download US Northeast region
wget https://download.geofabrik.de/north-america/us/northeast-latest.osm.pbf

# Or use BBBike for custom regions:
# Visit https://extract.bbbike.org/ and download your region
```

#### Step 2: Filter Data (Optional)
Reduce file size by keeping only relevant features:

```bash
# Keep only roads, buildings, and points of interest
osmium tags-filter \
  northeast-latest.osm.pbf \
  w/highway w/building n/amenity,shop,tourism \
  -o filtered.osm.pbf
```

#### Step 3: Generate mbtiles

**Using tippecanoe** (recommended):

```bash
# Install tippecanoe
# macOS: brew install tippecanoe
# Ubuntu: apt-get install tippecanoe
# Or use Docker: docker run --rm -v $(pwd):/data mapbox/tippecanoe

# Convert OSM to GeoJSON (simplified example)
# Then render to tiles
tippecanoe \
  -o tiles.mbtiles \
  -z 14 \                        # Max zoom level
  -Z 2 \                         # Min zoom level
  -l osm \                       # Layer name
  data.geojson
```

#### Step 4: Place in Data Directory
```bash
mkdir -p data/tileserver
cp tiles.mbtiles data/tileserver/map.mbtiles
```

## Option 3: Using Docker for Tile Generation

If you don't want to install tools locally, use Docker containers:

```bash
# Generate tiles using Mapbox tippecanoe in Docker
docker run --rm -v $(pwd):/data mapbox/tippecanoe:latest \
  tippecanoe \
  -o /data/tiles.mbtiles \
  -z 14 -Z 2 \
  /data/input.geojson

# Move to expected location
mv tiles.mbtiles data/tileserver/map.mbtiles
```

## Tile Characteristics

### File Size
- **Typical coverage**: 50-500 MB depending on zoom levels and region
- **Full planet**: 50+ GB at high zoom levels
- **Regional extract**: 10-200 MB

### Zoom Levels
- **Z2**: World view (very small file, lowest detail)
- **Z6-Z8**: Country/state level
- **Z10-Z12**: City/district level
- **Z14+**: Street level (larger files)

### Recommended Settings
```bash
# For vehicle tracking on highways
-z 14 \           # Max zoom (street level detail)
-Z 6              # Min zoom (country level)

# For in-vehicle use (balanced)
-z 12 \           # Moderate detail
-Z 4              # Good for highway overview
```

## Updating Tiles

To update the mbtiles with newer data:

```bash
# Download newer OSM data
wget https://download.geofabrik.de/north-america/us/northeast-latest.osm.pbf

# Generate new tiles
tippecanoe -o new-tiles.mbtiles -z 14 -Z 6 northeast-latest.osm.pbf

# Backup old tiles
mv data/tileserver/map.mbtiles data/tileserver/map.mbtiles.backup

# Use new tiles
mv new-tiles.mbtiles data/tileserver/map.mbtiles

# Restart tileserver
docker-compose restart tileserver
```

## Tools Reference

### tippecanoe
- **Purpose**: Render geographic data to vector tiles
- **Install**: `brew install tippecanoe` (macOS) or `apt-get install tippecanoe` (Ubuntu)
- **Docs**: https://github.com/mapbox/tippecanoe

### osmium
- **Purpose**: Filter and process OpenStreetMap data
- **Install**: `brew install osmium-tool` (macOS) or `apt-get install osmium-tool` (Ubuntu)
- **Docs**: https://osmium.readthedocs.io/

### ogr2ogr (GDAL)
- **Purpose**: Convert between geographic formats
- **Install**: `brew install gdal` or `apt-get install gdal-bin`

## Troubleshooting

### Tileserver Won't Start
```bash
# Check if mbtiles file exists
ls -lh data/tileserver/map.mbtiles

# Check logs
docker-compose logs tileserver

# The file MUST exist at exactly: data/tileserver/map.mbtiles
```

### File Too Large
- Reduce zoom levels (use `-z 12 -Z 4` instead of `-z 14 -Z 2`)
- Filter data to only needed features
- Use a smaller region

### File Not Generated
- Check that input data is valid GeoJSON or OSM format
- Ensure tippecanoe is installed correctly
- Try with sample data first:
  ```bash
  echo '[{"type":"Feature","geometry":{"type":"Point","coordinates":[-74.5,40]}}]' > test.geojson
  tippecanoe -o test.mbtiles test.geojson
  ```

## Resources

- **OpenStreetMap**: https://www.openstreetmap.org/
- **Geofabrik Downloads**: https://download.geofabrik.de/
- **BBBike Extracts**: https://extract.bbbike.org/
- **Tippecanoe**: https://github.com/mapbox/tippecanoe
- **Tileserver GL**: https://tileserver.readthedocs.io/

## Next Steps

Once you have your mbtiles file in place:

1. Start the application:
   ```bash
   docker-compose up -d
   ```

2. Verify Tileserver is working:
   ```bash
   curl http://localhost:8080/
   ```

3. Check the web UI for your maps:
   ```
   https://localhost/  (or https://127.0.0.1/)
   ```

The map should display your tile data!
