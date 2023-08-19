const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const express = require("express");
const http = require("http");
const bodyParser = require('body-parser');
const tilelive = require("@mapbox/tilelive");
const TileliveDecorator = require("tilelive-decorator");
const Protobuf = require("pbf");
const Decorator = require("@mapbox/tile-decorator");
const zlib = require("zlib");

// Register tilelive protocols
TileliveDecorator.registerProtocols(tilelive);
require("@mapbox/mbtiles").registerProtocols(tilelive);

function setupAppMiddleware(app) {
    app.use(bodyParser.json());
    app.use(function (req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept,Cache-Control");
        res.set({ "Cache-Control": "max-age=0" });
        next();
    });
}

function initializeTileServer(app, map, fileName) {
    tilelive.load(`mbtiles:./${fileName}.mbtiles`, function (err, source) {
        if (err) throw err;

        app.get("/", (req, res) => {
            res.send("Hello World");
        });

        app.get(/^\/v2\/tiles\/(\d+)\/(\d+)\/(\d+).pbf$/, function (req, res) {
            const { z, x, y } = req.params;
            source.getTile(z, x, y, function (err, tile, headers) {
                if (err) {
                    res.status(404).send(err.message);
                } else {
                    processTileData(tile, headers, map, res);
                }
            });
        });

        http.createServer(app).listen(app.get("port"), function () {
            console.log(`Express server listening on port ${app.get("port")}`);
        });
    });
}

function processTileData(tile, headers, map, res) {
    zlib.gunzip(tile, function (err, tile) {
        const pbf = new Protobuf(tile);
        var tile = Decorator.read(pbf.buf);
        const layer = tile.layers[0];
        const ids = Decorator.getLayerValues(layer, "id");
        const newProps = ids.map(id => ({ color: map.get(id) }));
        const keys = ["id"];
        Decorator.selectLayerKeys(layer, keys);
        Decorator.updateLayerProperties(layer, newProps);
        Decorator.mergeLayer(layer);
        const final = Decorator.write(tile);
        zlib.gzip(Buffer.from(final), (error, data) => {
            if (!error) {
                res.set(headers).send(data);
            }
        });
    });
}

if (cluster.isMaster) {
    const app = express();
    const port = 3000;
    app.set("port", port);
    setupAppMiddleware(app);

    for (let i = 0; i < 8; i++) {
        cluster.fork();
    }

    // Endpoint to update London cluster
    app.post("/updateLondon", (req, res) => {
        updateCluster(req, res, 4, true);
    });

    // Endpoint to update Tippe cluster
    app.post("/updateTippe", (req, res) => {
        updateCluster(req, res, 4, false);
    });

    http.createServer(app).listen(port, () => {
        console.log(`Master server listening on port ${port}`);
    });

    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died`);
    });

} else {
    const app = express();
    const port = 3000 + cluster.worker.id;
    app.set("port", port);
    setupAppMiddleware(app);

    const map = new Map();
    for (let i = 0; i < 6000000; i++) {
        map.set(i, "blue");
    }

    process.on('message', (message) => {
        map.set(message.id, message.newColor);
        console.log(`Worker on port ${port} updated by master`);
    });

    if (port <= 3004) {
        initializeTileServer(app, map, "Tippecanoe");
    } else {
        initializeTileServer(app, map, "London");
    }
}

function updateCluster(req, res, threshold, isGreaterThan) {
    const { id, color } = req.body;
    for (const workerId in cluster.workers) {
        if (isGreaterThan ? workerId > threshold : workerId <= threshold) {
            cluster.workers[workerId].send({ id, newColor: color });
        }
    }
    res.send("Cluster updated");
}
