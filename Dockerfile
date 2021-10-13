FROM node:latest AS webBuild
WORKDIR /app

COPY frontend/package*.json ./
RUN npm install

COPY frontend .
RUN npm run build

FROM python:3.8
WORKDIR /app
COPY requirements.txt ./

RUN pip3 install -r requirements.txt
RUN pip3 install git+https://gitlab.internal.sanger.ac.uk/hgi-projects/uploadtogenestack#egg=uploadtogenestack

COPY . .
COPY --from=webBuild /app/out frontend/out

CMD ["python3", "-m", "flask", "run", "--host=0.0.0.0"]