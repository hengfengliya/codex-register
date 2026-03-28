# 使用官方 Python 基础镜像 (使用 slim 版本减小体积)
FROM python:3.11-slim

# 设置工作目录
WORKDIR /app

ARG DEFAULT_WEBUI_PORT=8080

# 设置环境变量
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    # WebUI 默认配置 (Railway 默认路由 8080)
    WEBUI_HOST=0.0.0.0 \
    WEBUI_PORT=${DEFAULT_WEBUI_PORT} \
    LOG_LEVEL=info \
    DEBUG=0

# 安装系统依赖
# (curl_cffi 等库可能需要编译工具)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        gcc \
        python3-dev \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件并安装
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# 复制项目代码
COPY . .

# 暴露端口
EXPOSE ${DEFAULT_WEBUI_PORT}

# 启动 WebUI
# Railway 通过 PORT 环境变量指定端口，使用 shell 形式传递给 WEBUI_PORT
CMD sh -c "python webui.py --port ${PORT:-8080}"
