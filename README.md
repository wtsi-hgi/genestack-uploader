# Genestack Uplaoder

A HTTP server providing an API and a frontend for easy uploading to Genestack

## Running with Docker 🐳

1. Update `frontend/.env` if needed

2. Build the image, i.e.

```
docker build -t mercury/genestack-uploader:0.1.dev .
```

The tagging scheme used on this project is `mercury/genestack-uploader:X.Y.{prod|dev}`, where X.Y is the version number, and the final tag is `prod` or `dev`, describing which URL is specified in `.env`

**Remember to update the version in `config.py` - this is displayed on the site**

3. Run the image. You must:
    - provide the env variable `GSSERVER` with a value of either `qc` or `default`
    - link to config files `/root/.genestack.cfg` and `/root/.s3cfg`

The app runs on port 5000 on a Docker network, so that can be used to forward it, such as in a nginx container.

To test, you can also expose port 5000, i.e.

```
docker run -p 80:5000 -e GSSERVER=default -v /home/ubuntu/genestack-uploader/configs:/root -d --name genestack-uploader mercury/genestack-uploader:0.1.dev
```