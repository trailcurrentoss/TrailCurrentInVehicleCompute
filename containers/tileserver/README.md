# Tileserver GL - Vector Map Tile Server

TileServer GL provides vector tiles and map styles for the Trail Current project. It serves map data to web, PWA, and native mobile clients using MapLibre GL.

## Build and Deployment

### Using Pre-Built Docker Hub Image (Recommended)

The tileserver image is **already built and published to Docker Hub**:

```
docker.io/trailcurrent/trailcurrent-tile-server:latest
```

Use this in `docker-compose.yml`:
```yaml
tileserver:
  image: trailcurrent/trailcurrent-tile-server:latest
  # ... rest of config
```

Supports: `linux/amd64`, `linux/arm64`

### Building Locally (Advanced)

To rebuild the image locally, fonts must be available first:

```bash
# 1. Ensure fonts are set up
cd containers/tileserver
./setup.sh

# 2. Build the image
docker build -t trailcurrent/trailcurrent-tile-server:latest .

# 3. (Optional) Push to Docker Hub
docker push trailcurrent/trailcurrent-tile-server:latest
```

**Note:** The `fonts/` directory is git-ignored (171MB) but required at build time. The `setup.sh` script automatically copies fonts from the Product directory if needed.

## Configuration

- **config.json** - TileServer configuration (paths, styles, CORS, etc.)
- **styles/** - MapLibre GL style definitions (10 styles available)
- **fonts/** - Font glyphs for map labels (59 font families)
- **sprites/** - Icon sprites for map markers and decorations

### Available Map Styles

1. bright - Light and colorful
2. bright-dark - Dark colorful variant
3. dark-matter - Dark minimalist
4. fiord-color - Nordic colors
5. liberty - Red/white/blue theme
6. positron - Light/neutral
7. toner - Black and white
8. maptiler-basic - Simple basemap
9. 3d - 3D perspective with terrain
10. 3d-dark - Dark 3D variant (used by frontend for dark mode)

## Data Directory

Runtime data mounts:
- `data/us-tiles.mbtiles` - Vector tile data (not in git, volume-mounted)
- `data/tileserver/` - Runtime cache and temporary files

## Vector Tile Endpoints

**Styles:**
```
GET /styles/{style}/style.json
```

**Tiles:**
```
GET /data/us-tiles/{z}/{x}/{y}.pbf
```

**Glyphs (fonts):**
```
GET /fonts/{fontstack}/{range}.pbf
```

**Sprites:**
```
GET /sprites/sprite.json
GET /sprites/sprite.png
```

All clients (web, PWA, Android, iOS, AGL) use these endpoints for client-side map rendering.

## Known Issues

**See KNOWN_ISSUES.md** for details on MapLibre GL Native v5.5.0 glyph compatibility and server-side rendering limitations.

Summary: Server-side static map rendering (`serveStaticMaps`) is disabled due to glyph compatibility issues. All interactive map features work perfectly with client-side rendering.
