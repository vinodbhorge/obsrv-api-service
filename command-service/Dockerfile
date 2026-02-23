FROM --platform=linux/amd64 public.ecr.aws/docker/library/python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    librdkafka-dev \
    curl \
    jq \
    vim \
    && rm -rf /var/lib/apt/lists/*

# Fix MEDIUM: upgrade pip to >= 25.3 (CVE fix)
RUN pip install --no-cache-dir --upgrade "pip>=25.3"

# Pinned kubectl v1.35.1 (Go 1.25.6) — fixes Go stdlib & golang.org/x/net CVEs
RUN curl -LO "https://dl.k8s.io/release/v1.35.1/bin/linux/amd64/kubectl" && \
    chmod +x kubectl && \
    mv kubectl /usr/local/bin/

# Pinned Helm v3.20.0 (Go 1.25+, containerd 1.7.30) — fixes Go stdlib, containerd & x/net CVEs
RUN curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash -s -- --version v3.20.0
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY src ./src
COPY helm-charts ./helm-charts
WORKDIR /app/src
CMD [ "uvicorn", "routes:app", "--host", "0.0.0.0" ]