FROM --platform=linux/amd64 public.ecr.aws/docker/library/node:24.13.1-slim
RUN npm install -g npm@11.10.0 \
 && npm pack tar@7.5.8 \
 && tar -xzf tar-7.5.8.tgz -C /usr/local/lib/node_modules/npm/node_modules/tar --strip-components=1 \
 && rm tar-7.5.8.tgz \
 && npm pack minimatch@10.2.1 \
 && npm cache clean --force \
 && cp -r /usr/local/lib/node_modules/npm/node_modules/minimatch/node_modules /tmp/minimatch_nm 2>/dev/null || true \
 && tar -xzf minimatch-10.2.1.tgz -C /usr/local/lib/node_modules/npm/node_modules/minimatch --strip-components=1 \
 && cp -r /tmp/minimatch_nm /usr/local/lib/node_modules/npm/node_modules/minimatch/node_modules 2>/dev/null || true \
 && rm -rf /tmp/minimatch_nm minimatch-10.2.1.tgz
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates openssl \
 && apt-get upgrade -y \
 && rm -rf /var/lib/apt/lists/*
RUN mkdir -p /opt/api-service
COPY ./api-service  ./opt/api-service
WORKDIR /opt/api-service
RUN rm -rf postman-collection
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "start"]