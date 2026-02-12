# Known Issues - Tileserver

## MapLibre GL Native v5.5.0 Glyph Compatibility Issue

### Problem
Server-side static map rendering (via `/styles/{style}/static/...` endpoints) fails with "Invalid range" errors when MapLibre GL Native v5.5.0 attempts to load PBF font glyphs.

### Error Details
```
Failed to load glyph range 0-255 for font stack "Noto Sans Regular": Invalid range
```

### Impact
- **Affected feature:** `serveStaticMaps` option (currently disabled)
- **Affected fonts:** All PBF glyph formats, including:
  - Noto Sans (Regular, Italic, Bold)
  - Metropolis (all variants)
  - Open Sans (all variants)
  - PT Sans (all variants)
  - Roboto (all variants)
- **Root cause:** Version incompatibility between PBF glyph format and MapLibre GL Native v5.5.0
- **Investigation:** Font regeneration attempts with openmaptiles pre-built glyphs (77 fonts) all failed with the same errors, indicating the problem is systemic, not font-specific

### What Still Works
✅ **Client-side rendering is completely unaffected:**
- Vector tile serving (200 OK)
- Font glyph HTTP downloads (200 OK)
- Style JSON endpoints (200 OK)
- MapLibre GL JS client-side map rendering
- MapLibre GL Native client-side rendering (web, PWA, mobile, AGL)

✅ **All interactive maps work perfectly** - Frontend, PWA, native apps all render maps on the client with no issues

❌ **What doesn't work:**
- Static map image generation: `/styles/{style}/static/{lon},{lat},{zoom}/{width}x{height}.png`
- Tileserver admin interface map previews
- Server-side map rendering for PDFs, emails, thumbnails, etc.

### Workaround
Server-side static map rendering has been disabled (`serveStaticMaps: false`) in config.json. This feature will remain disabled until a compatible solution is available.

### Future Solutions to Investigate
When static map rendering is needed, consider these approaches:

1. **MapLibre Font Maker** (https://maplibre.org/font-maker/)
   - Web-based glyph generator with different pipeline
   - May produce more compatible glyphs
   - Requires TTF/OTF source files

2. **Older TileServer Version**
   - Try `maptiler/tileserver-gl:v4.11.0` (uses older MapLibre GL Native)
   - Try `openmaptiles/tileserver-gl-light` (community fork)

3. **build_pbf_glyphs Rust Tool**
   - Alternative glyph generation implementation
   - More complex setup but local control

4. **Upstream Bug Report**
   - File issue with MapLibre/TileServer-GL projects
   - Document exact error and reproduction steps
   - May need to wait for upstream fix

### Technical Details
- **TileServer Version:** maptiler/tileserver-gl:latest
- **MapLibre GL Native Version:** v5.5.0 (bundled in tileserver-gl)
- **Glyph Format:** PBF (Protocol Buffer)
- **Glyph Generation Methods Tested:**
  - openmaptiles/fonts pre-built glyphs
  - Multiple font families and variants
  - All tested with same result: "Invalid range" errors

### How to Re-Enable (If Solution Found)
When a working solution is found:

1. Generate compatible glyphs using the successful method
2. Update `containers/tileserver/fonts/` directory
3. Set `serveStaticMaps: true` in `containers/tileserver/config.json`
4. Rebuild and test: `docker build -t test-tileserver:latest .`
5. Test static map rendering: `curl http://localhost:8080/styles/bright/static/-73,39.5,4/256x256.png`
6. Verify no "Invalid range" errors in logs: `docker logs test-tileserver | grep "Invalid range"`

### Questions or Need This Feature?
If you need static map rendering functionality, research one of the "Future Solutions" above and update the issue with findings.
