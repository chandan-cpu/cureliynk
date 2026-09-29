FROM python:3.13-slim

WORKDIR /app

COPY requirements.txt requirements-docker.txt ./

# CUDA-enabled PyTorch
RUN pip install --no-cache-dir \
    --index-url https://download.pytorch.org/whl/cu128 \
    torch==2.11.0+cu128 \
    torchvision==0.26.0+cu128 \
    torchaudio==2.11.0+cu128

# Remaining application dependencies
RUN pip install --no-cache-dir -r requirements-docker.txt

COPY . .

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]