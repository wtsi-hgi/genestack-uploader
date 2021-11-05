# Build Frontend (nextjs app)
FROM node:latest AS webBuild
WORKDIR /app

COPY frontend/package*.json ./
RUN npm install

COPY frontend .
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
RUN pip3 install git+https://gitlab.internal.sanger.ac.uk/hgi-projects/uploadtogenestack@2.5#egg=uploadtogenestack

# Copying Python scripts, and built frontend
COPY . .
COPY --from=webBuild /app/out frontend/out

CMD ["waitress-serve", "--call", "app:production"]