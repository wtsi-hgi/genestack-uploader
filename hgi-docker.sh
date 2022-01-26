#!/usr/bin/env bash

VERSION=$1

# Dev
echo "NEXT_PUBLIC_HOST=http://172.27.17.238/genestack-uploader" > frontend/.env
docker build . --no-cache -t mercury/genestack-uploader:${VERSION}.dev

# Prod
echo "NEXT_PUBLIC_HOST=https://apps.hgi.sanger.ac.uk/genestack-uploader" > frontend/.env
docker build . -t mercury/genestack-uploader:${VERSION}.prod

