FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends     build-essential libexpat1-dev zlib1g-dev libbz2-dev libboost-python-dev     libprotobuf-dev protobuf-compiler libosmium2-dev     && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY pyproject.toml README.md ./
COPY campulator_pipeline ./campulator_pipeline
RUN pip install --no-cache-dir .
ENTRYPOINT ["python", "-m", "campulator_pipeline.cli"]
