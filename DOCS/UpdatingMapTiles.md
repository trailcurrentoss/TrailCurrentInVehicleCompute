# Map Tiles

> **Note**: Map tile generation is a **one-time task** during initial setup, and an infrequent task thereafter (e.g., once per year to refresh OpenStreetMap data).

## Overview

The tileserver requires a `.mbtiles` file containing OpenMapTiles-schema vector tiles. This file is a SQLite database with pre-rendered map tiles at various zoom levels.

**Required location:** `data/tileserver/map.mbtiles`

The tileserver container **will not start** without this file.

## How to Get Map Tiles

### Option 1: Copy from a Team Member

If another team member already has a `map.mbtiles` file, copy it:

```bash
mkdir -p data/tileserver
cp /path/to/existing/map.mbtiles data/tileserver/map.mbtiles
```

### Option 2: Generate from OpenStreetMap Data

Use the **PbfTileConverter** utility to download OpenStreetMap data and convert it to mbtiles:

**Location:** [../../../Utilities/PbfTileConverter](../../../Utilities/PbfTileConverter)

```bash
cd ../../../Utilities/PbfTileConverter
./convert.sh north-america/us/colorado    # Small test region (~200MB download)
# or
./convert.sh north-america/us             # Full US (~9GB download, needs ~5GB RAM)
```

The utility downloads OSM data from [Geofabrik](https://download.geofabrik.de/) and converts it using [Planetiler](https://github.com/onthegomap/planetiler) (Apache 2.0 license). See the utility's README for full instructions.

## Verifying Tiles

After placing the file, verify the tileserver can load it:

```bash
docker compose up -d tileserver
curl http://localhost:8080/health
```

## Tile Size Reference

- Single US state: 100MB - 2GB
- Full US: 10 - 25GB
- Global: 50+ GB

For development, a single state extract works fine.
