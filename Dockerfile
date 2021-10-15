# Build Frontend (nextjs app)
FROM node:latest AS webBuild
WORKDIR /app

COPY frontend/package*.json ./
RUN npm install

COPY frontend .
RUN npm run build

# Main Container
FROM python:3.8

# Installing bcftools
RUN apt-get install make

WORKDIR /usr/local
RUN wget https://github.com/samtools/bcftools/releases/download/1.13/bcftools-1.13.tar.bz2
RUN tar  -xjf bcftools-1.13.tar.bz2

WORKDIR /usr/local/bcftools-1.13
RUN ./configure --prefix=/usr/local/bcftools
RUN make
RUN make install

ENV PATH="/usr/local/bcftools/bin:${PATH}"

# Setting up Python dependencies
WORKDIR /app
COPY requirements.txt ./

RUN pip3 install -r requirements.txt
RUN pip3 install git+https://gitlab.internal.sanger.ac.uk/hgi-projects/uploadtogenestack@michaelg-web-interface-changes#egg=uploadtogenestack

# Copying Python scripts, and built frontend
COPY . .
COPY --from=webBuild /app/out frontend/out

CMD ["python3", "-m", "flask", "run", "--host=0.0.0.0"]