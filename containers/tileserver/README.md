# Tileserver GL - Vector Map Tile Server

TileServer GL provides vector tiles and map styles for the Trail Current project. It serves map data to web, PWA, and native mobile clients using MapLibre GL.

## Fonts

Font glyphs (PBF format) are **committed to the repository** in the `fonts/` directory. No setup is needed after cloning.

The following font families are included (used by the project's map styles):
- Noto Sans (Regular, Bold, Italic) — SIL Open Font License
- Metropolis (Regular, Light, Light Italic, Medium Italic) — Unlicense (Public Domain)
- Roboto (Regular, Medium, Condensed Italic) — Apache 2.0

See `fonts/LICENSE` for full licensing details.

To verify fonts are present:
```bash
./setup.sh
```

## Build and Deployment

### Using Pre-Built Docker Hub Image (Recommended for Development)

The tileserver image is published to Docker Hub with styles and fonts baked in:

```
docker.io/trailcurrent/trailcurrent-tile-server:latest
```

`docker compose up -d` pulls this image automatically. Supports: `linux/amd64`, `linux/arm64`.

### Building Locally

To rebuild the image locally (e.g., after modifying styles):

```bash
# From the project root
docker build -t trailcurrent/trailcurrent-tile-server:latest containers/tileserver/
```

Fonts are in the repository, so no pre-setup is needed.

## Configuration

- **config.json** — TileServer configuration (paths, styles, CORS, etc.)
- **styles/** — MapLibre GL style definitions (10 styles available)
- **fonts/** — Font glyphs for map labels (10 font families)
- **sprites/** — Icon sprites for map markers and decorations

### Available Map Styles

1. bright — Light and colorful
2. bright-dark — Dark colorful variant
3. dark-matter — Dark minimalist
4. fiord-color — Nordic colors
5. liberty — Red/white/blue theme
6. positron — Light/neutral
7. toner — Black and white
8. maptiler-basic — Simple basemap
9. 3d — 3D perspective with terrain
10. 3d-dark — Dark 3D variant (used by frontend for dark mode)

## Vector Tile Endpoints

**Styles:**
```
GET /styles/{style}/style.json
```

**Tiles:**
```
GET /data/map/{z}/{x}/{y}.pbf
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

See **KNOWN_ISSUES.md** for details on MapLibre GL Native v5.5.0 glyph compatibility and server-side rendering limitations.

Summary: Server-side static map rendering (`serveStaticMaps`) is disabled due to glyph compatibility issues. All interactive maps work perfectly with client-side rendering.
