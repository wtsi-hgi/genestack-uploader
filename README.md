# Genestack Uplaoder

A HTTP server providing an API and a frontend for easy uploading to Genestack

## Running with Docker 🐳

1. Build the image, i.e.

```
docker build -t genestack_uploader .
```

2. Run the image. You must export port 5000 and provide the env variable `GS-SERVER` with a value of either `qc` or `default`, i.e.

```
docker run -p 80:5000 -e GSSERVER=default -d genestack_uploader
```

**IMPORTANT TODO:** as the Docker container requires access to the data files, it will also need a volume mounted to the identical path on the host machine. We'll get to that when we worry about actually deploying this, which is likely to be interesting 🙀