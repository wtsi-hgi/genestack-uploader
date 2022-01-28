# Genestack Uplaoder

A HTTP server providing an API and a frontend for easy uploading to Genestack

## Running with Docker 🐳

1. Update `frontend/.env` and `config.py` if needed. (See `docs/spec/main-spec-updates/1.md` for discussion about base URL paths.)

2. Build the image, i.e.

```
docker build -t mercury/genestack-uploader:0.1.dev .
```

The tagging scheme used on this project is `mercury/genestack-uploader:X.Y.{prod|dev}`, where X.Y is the version number, and the final tag is `prod` or `dev`, describing which URL is specified in `.env` and `config.py`. (This is also described in more detail in `docs/spec/main-spec-updates/1.md`.)

If deploying in the HGI environments, the script `hgi-docker.sh`, passing the argument of the verison number will build the images as we need, for example `./hgi-docker.sh 2.0` will create `mercury/genestack-uploader:2.0.dev` and `mercury/genestack-uploader:2.0.prod` with the appropriate configuration in the image.

3. Run the image. You must:
    - provide the env variable `GSSERVER` with a value of either `qc` or `default`
    - link to config files `/root/.genestack.cfg` and `/root/.s3cfg`
    - link SSH key files to `/root/.ssh/id_rsa_genestack` and `/root/.ssh/id_rsa_genestack.pub`

Optional Environment Variables:
    - `JOB_EXPIRY_HOURS`: defaults to `168` (hours in a week) - this is how long a job should be kept after it has completed for it to be accessed using the `/jobs/{uuid}` API endpoint
    - `LOG_LEVEL`: one of `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL` (defaults to `INFO`) - the minimum level of logs to be reported

The app runs on port 5000 on a Docker network, so that can be used to forward it, such as in a nginx container.

To test, you can also expose port 5000, i.e.

```
docker run -p 80:5000 -e GSSERVER=default -v /home/ubuntu/genestack-uploader/configs:/root -d --name genestack-uploader mercury/genestack-uploader:0.1.dev
```

## Version Numbering

There are two important version numbers to keep track of.

- The version number of the `uploadtogenestack` package
    - This is updated in the package's `setup.py` file, and is given a tag on GitLab
    - This tag number is then used in this repositories Dockerfile to install the right version
- The version number of this web app
    - This is updated in `config.py` and is also reflected in the Docker image tag

Ensure that these are kept up to date, as it really helps find bugs when you know which versions of each a particular image is running. The version numbers are displayed at the bottom of the homepage.
