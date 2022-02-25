# Genestack Uploader
# A HTTP server providing an API and a frontend for easy uploading to Genestack

# Copyright (C) 2021 Genome Research Limited

# Author: Michael Grace <mg38@sanger.ac.uk>

# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.

# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.

# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <https://www.gnu.org/licenses/>.

# Build Frontend (nextjs app)
FROM node:latest AS webBuild
WORKDIR /app

COPY frontend/package*.json ./
RUN npm install

COPY frontend .
ENV NODE_OPTIONS=--openssl-legacy-provider
RUN npm run build

# Main Container
FROM python:3.8
WORKDIR /app

# Installing bcftools
RUN apt-get install make

RUN wget https://github.com/samtools/bcftools/releases/download/1.13/bcftools-1.13.tar.bz2
RUN tar -xjf bcftools-1.13.tar.bz2

WORKDIR /app/bcftools-1.13
RUN ./configure --prefix=/app/bcftools
RUN make
RUN make install

ENV PATH="/app/bcftools/bin:${PATH}"

# Setting up Python dependencies
WORKDIR /app
COPY requirements.txt ./

RUN pip3 install -r requirements.txt
RUN pip3 install git+https://gitlab.internal.sanger.ac.uk/hgi-projects/uploadtogenestack@2.10#egg=uploadtogenestack

# Copying Python scripts, and built frontend
COPY . .
COPY --from=webBuild /app/out frontend/out

# Although this just runs it in Flask,
# and it'll complain about it being run in
# development mode, running it in a production
# environment, the multiprocessing goes mad
# trying to pickle objects.
CMD ["python3", "app.py"]
