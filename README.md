# Tile Server with Dynamic Color Update

This project sets up a tile server using Node.js, Express, and the Mapbox libraries, allowing for dynamic updates for map tiles properties such as color,id, and etc based on incoming requests.

## Overview

- **Cluster-based**: Utilizes multiple CPU cores for efficient request handling and tile updates using Node's `cluster` module.
- **Dynamic Tile Color Update**: Allows for updating the color of specific tiles in real-time based on requests.
- **Supports Multiple Tilesets**: Can handle tiles file stored in `.mbtiles` and `.pbf` format.
- 
## Benefits of the Dynamic Tile Server

1. **Dynamic Tile Updates**: 
   - Enables real-time color updates to tiles without the need for re-rendering. This is crucial for representing dynamic data on maps, ensuring the visualization always reflects the latest information.

2. **Efficient Resource Utilization**:
   - Utilizes multiple CPU cores through Node's `cluster` module, ensuring optimal performance and responsiveness when handling multiple simultaneous requests.

4. **Protocol Buffers Efficiency**:
   - Employs Google's Protocol Buffers for data serialization, leading to faster and more efficient tile data processing and transmission compared to traditional methods.

5. **Compression for Speed**: 
   - Uses gzip compression before sending tiles, reducing data transfer sizes and improving load times for end-users.


## Prerequisites

- Node.js
- npm

## Dependencies

- `express`
- `http`
- `@mapbox/tilelive`
- `@mapbox/tile-decorator`
- `@mapbox/mbtiles`
- `pbf`
- `zlib`
- `body-parser`
- 
## Tile Processing (`processTileData` function)

When a tile is requested, a sequence of operations is performed on it:

1. **Decompression**: 
   - The tile data, initially in a compressed format (gzip), is decompressed.

2. **Reading Tile Data**: 
   - The decompressed tile data is converted into Protocol Buffers format, a method developed by Google to serialize structured data. It's then read using the tile decorator.

3. **Tile Modification**: 
   - The first layer of the tile is extracted. 
   - For each ID found in this layer, the associated color from a provided map is fetched. 
   - The tile's properties are updated with the new color values.
   - Any fragmented parts of the layer are merged.

4. **Re-serialization**: 
   - After all modifications, the tile data is serialized again for transmission.

5. **Compression & Response**: 
   - The serialized tile data is compressed again using gzip.
   - It's then sent back as a response.

This sequence ensures that the requested tile is processed, modified, and returned to the requester in the appropriate format with the updated properties.

## Usage

### Update London Tile Colors:
Send a POST request to `/updateLondon` with the `id` and `color` fields to update the color of a specific London tile using id attribute.

### Fetching Tiles:
Tiles can be fetched using the following endpoint format:
```bash
/v2/tiles/{z}/{x}/{y}.pbf
