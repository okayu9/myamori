FROM docker.io/cloudflare/sandbox:latest

RUN pip3 install --no-cache-dir \
    numpy \
    pandas \
    matplotlib \
    scipy
