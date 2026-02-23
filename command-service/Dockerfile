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

# Fix CRITICAL: pin kubectl v1.32.4+ (compiled with Go >= 1.25.7, fixes crypto/tls CVE)
RUN curl -LO "https://dl.k8s.io/release/v1.32.4/bin/linux/amd64/kubectl" && \
    chmod +x kubectl && \
    mv kubectl /usr/local/bin/

# Fix CRITICAL: pin Helm v3.17.3+ (compiled with Go >= 1.25.7, fixes crypto/tls CVE)
RUN curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash -s -- --version v3.17.3
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY src ./src
COPY helm-charts ./helm-charts
WORKDIR /app/src
CMD [ "uvicorn", "routes:app", "--host", "0.0.0.0" ]