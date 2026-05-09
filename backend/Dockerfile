# ── Stage 1: build ───────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/core/sdk:3.1-buster AS builder

WORKDIR /src

COPY CertificateEngine.csproj .
RUN dotnet restore

COPY . .
RUN dotnet publish -c Release -o /app/publish

# ── Stage 2: runtime ─────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/core/aspnet:3.1-buster-slim AS runtime

# Install Chromium and its dependencies for PuppeteerSharp
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    fonts-noto \
    fonts-noto-cjk \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-6 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    libxshmfence1 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Tell PuppeteerSharp to use the system Chromium; skip download
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_DOWNLOAD=true
# Cloud Run injects PORT; default to 8080 (ASP.NET reads ASPNETCORE_URLS)
ENV ASPNETCORE_URLS=http://+:8080

WORKDIR /app
COPY --from=builder /app/publish .

EXPOSE 8080

ENTRYPOINT ["dotnet", "CertificateEngine.dll"]
