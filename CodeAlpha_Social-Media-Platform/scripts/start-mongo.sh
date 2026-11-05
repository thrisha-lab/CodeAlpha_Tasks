#!/bin/bash
# Starts the official MongoDB 7.0 daemon with persistent storage in the project.
exec /home/z/.cache/mongodb-binaries/mongod-x64-debian-7.0.24 \
  --dbpath /home/z/my-project/data/db \
  --port 27017 \
  --bind_ip 127.0.0.1 \
  --wiredTigerCacheSizeGB 0.25
