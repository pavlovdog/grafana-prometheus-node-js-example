FROM ubuntu:18.04

WORKDIR /app

RUN \
    set -eux; \
    apt-get update && \
    apt-get install -y curl build-essential python git && \
    curl -sL https://deb.nodesource.com/setup_12.x | bash - && \
    apt-get install -y nodejs

COPY . .

RUN npm install --unsafe-perm

ENTRYPOINT ["node"]

