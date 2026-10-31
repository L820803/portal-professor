ARG NODE_VERSION=20

# ==============================================
# Estágio 1: Builder - Compilação de assets
# ==============================================

FROM composer:2 AS composer-bin

FROM ubuntu:22.04 AS builder
ARG NODE_VERSION
ARG VITE_APP_ENV
ARG VITE_APP_TAG
ARG VITE_APP_IMG
ARG VITE_APP_DATA

WORKDIR /app

ENV DEBIAN_FRONTEND=noninteractive \
    VITE_APP_ENV=${VITE_APP_ENV} \
    VITE_APP_TAG=${VITE_APP_TAG} \
    VITE_APP_IMG=${VITE_APP_IMG} \
    VITE_APP_DATA=${VITE_APP_DATA}

# Instalar todas as dependências de build em uma única camada
RUN apt-get update \
    && mkdir -p /etc/apt/keyrings \
    && apt-get install -y --no-install-recommends \
       curl ca-certificates gnupg zip unzip git libpng-dev \
    && curl -sS 'https://keyserver.ubuntu.com/pks/lookup?op=get&search=0x14aa40ec0831756756d7f66c4f4ea0aae5267a6c' | gpg --dearmor | tee /etc/apt/keyrings/ppa_ondrej_php.gpg > /dev/null \
    && echo "deb [signed-by=/etc/apt/keyrings/ppa_ondrej_php.gpg] https://ppa.launchpadcontent.net/ondrej/php/ubuntu jammy main" > /etc/apt/sources.list.d/ppa_ondrej_php.list \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_VERSION.x nodistro main" > /etc/apt/sources.list.d/nodesource.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
       php8.3-cli php8.3-mbstring php8.3-xml php8.3-zip php8.3-curl php8.3-gd \
       nodejs \
    && npm install -g npm \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Copiar Composer da imagem oficial (mais confiável que instalar via curl)
COPY --from=composer-bin /usr/bin/composer /usr/bin/composer

# Copiar composer.json e composer.lock primeiro (cache layer)
COPY app/composer.json app/composer.lock ./

# Instalar dependências do Composer
RUN composer install --no-scripts --no-autoloader --no-dev --prefer-dist --no-progress

# Copiar código Laravel necessário para build
COPY app/app ./app
COPY app/bootstrap ./bootstrap
COPY app/config ./config
COPY app/database ./database
COPY app/routes ./routes
COPY app/artisan ./artisan

# Pastas de runtime exigidas pelo package:discover (o Livewire, dependência do Pulse,
# usa o compilador do Blade na inicialização e falha sem storage/framework/views)
RUN mkdir -p storage/framework/views storage/framework/cache storage/framework/sessions storage/logs bootstrap/cache

# Gerar autoload otimizado
RUN composer dump-autoload --optimize --no-dev

# Copiar package.json e package-lock.json
COPY app/package*.json ./

# Instalar dependências do Node
RUN npm ci --no-audit --no-fund

# Instalar Chrome via Puppeteer
RUN npx puppeteer browsers install chrome

# Copiar código fonte do frontend
COPY app/resources ./resources
COPY app/public ./public
COPY app/vite.config.ts ./
COPY tsconfig.json* ./

# Build do React/Vite
RUN npm run build

# ==============================================
# Estágio 2: Node pruner - Limpar devDependencies
# ==============================================
FROM node:${NODE_VERSION}-slim AS node-pruner
ARG NODE_VERSION

WORKDIR /app

# Copiar apenas package*.json e node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# Remover devDependencies
RUN npm prune --production --no-audit --no-fund \
    && rm -rf /root/.npm /tmp/*

# ==============================================
# Estágio 3: Imagem de produção otimizada
# ==============================================
FROM ubuntu:22.04
ARG NODE_VERSION

LABEL maintainer="Agora Tech"

ARG WWWGROUP=1000
ARG POSTGRES_VERSION=15
ARG NODE_VERSION=20

WORKDIR /var/www/html

ENV DEBIAN_FRONTEND=noninteractive \
    TZ="America/Porto_Velho" \
    PUPPETEER_CACHE_DIR=/home/sail/.cache/puppeteer

# Configurar timezone e instalar TODAS as dependências em uma única camada
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone \
    && mkdir -p /etc/apt/keyrings \
    && apt-get update \
    # Dependências básicas
    && apt-get install -y --no-install-recommends \
       gnupg gosu curl ca-certificates zip unzip \
       supervisor sqlite3 libcap2-bin libpng16-16 \
       dnsutils librsvg2-bin ffmpeg nginx \
    # Adicionar repositórios
    && curl -sS 'https://keyserver.ubuntu.com/pks/lookup?op=get&search=0x14aa40ec0831756756d7f66c4f4ea0aae5267a6c' | gpg --dearmor | tee /etc/apt/keyrings/ppa_ondrej_php.gpg > /dev/null \
    && echo "deb [signed-by=/etc/apt/keyrings/ppa_ondrej_php.gpg] https://ppa.launchpadcontent.net/ondrej/php/ubuntu jammy main" > /etc/apt/sources.list.d/ppa_ondrej_php.list \
    && curl -sS https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor | tee /etc/apt/keyrings/pgdg.gpg >/dev/null \
    && echo "deb [signed-by=/etc/apt/keyrings/pgdg.gpg] http://apt.postgresql.org/pub/repos/apt jammy-pgdg main" > /etc/apt/sources.list.d/pgdg.list \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_VERSION.x nodistro main" > /etc/apt/sources.list.d/nodesource.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
       php8.3-cli php8.3-fpm \
       php8.3-pgsql php8.3-sqlite3 php8.3-gd php8.3-curl \
       php8.3-imap php8.3-mysql php8.3-mbstring \
       php8.3-xml php8.3-zip php8.3-bcmath php8.3-soap \
       php8.3-intl php8.3-readline php8.3-ldap \
       php8.3-msgpack php8.3-igbinary php8.3-redis \
       php8.3-memcached php8.3-imagick php8.3-opcache \
    # Clientes de banco
    && apt-get install -y --no-install-recommends \
       default-mysql-client postgresql-client-$POSTGRES_VERSION \
    # Node.js (runtime mínimo para Puppeteer)
    && apt-get install -y --no-install-recommends nodejs \
    # Dependências do Chromium/Puppeteer
    && apt-get install -y --no-install-recommends \
       libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
       libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
       libgbm1 libpango-1.0-0 libcairo2 libasound2 libatspi2.0-0 \
       fonts-liberation xdg-utils libxshmfence1 libglib2.0-0 \
       libx11-6 libx11-xcb1 libxcb1 libxext6 libxrender1 \
    # Limpeza agressiva
    && apt-get -y autoremove \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* \
    && rm -rf /var/cache/apt/archives/* \
    && rm -rf /usr/share/doc/* /usr/share/man/* /usr/share/locale/* \
    && rm -rf /root/.gnupg

# Criar usuário sail e diretórios necessários
RUN groupadd --force -g $WWWGROUP sail \
    && useradd -ms /bin/bash --no-user-group -g $WWWGROUP -u 1337 sail \
    && mkdir -p /var/www/html/storage/logs \
       /var/www/html/storage/framework/cache \
       /var/www/html/storage/framework/sessions \
       /var/www/html/storage/framework/views \
       /var/www/html/storage/app/public \
       /var/www/html/bootstrap/cache \
       /var/www/html/public/build \
       /run/php \
       /home/sail/.cache \
       /var/log/supervisor \
    && chown -R sail:sail /home/sail

# Copiar vendor do builder (evita instalar Composer na imagem final)
COPY --from=builder --chown=sail:sail /app/vendor /var/www/html/vendor

# Copiar código da aplicação Laravel
COPY --chown=sail:sail app/ /var/www/html

# Remover hot file do Vite
RUN rm -f /var/www/html/public/hot

# Copiar assets buildados do React
COPY --from=builder --chown=sail:sail /app/public/build /var/www/html/public/build

# Copiar node_modules limpo (apenas produção)
COPY --from=node-pruner --chown=sail:sail /app/node_modules /var/www/html/node_modules

# Copiar cache do Puppeteer (Chrome instalado)
COPY --from=builder --chown=sail:sail /root/.cache/puppeteer /home/sail/.cache/puppeteer

# Configurar permissões e link simbólico
RUN chown -R sail:sail /home/sail/.cache \
    && chmod -R 755 /home/sail/.cache \
    && ln -sf /var/www/html/storage/app/public /var/www/html/public/storage \
    && chmod -R 775 /var/www/html/storage \
    && chmod -R 775 /var/www/html/bootstrap/cache \
    && chmod -R 755 /var/www/html/public/build \
    && chown -R sail:sail /var/www/html/storage \
    && chown -R sail:sail /var/www/html/bootstrap/cache

# Limpar caches de desenvolvimento e regenerar package discovery
# (necessário porque o código pode ter cache de pacotes dev)
RUN cd /var/www/html \
    && rm -f bootstrap/cache/packages.php \
    && rm -f bootstrap/cache/services.php \
    && php artisan package:discover --ansi \
    && php artisan view:cache \
    && php artisan event:cache

# Copiar arquivos de configuração
COPY docker/production/8.3/start-container /usr/local/bin/start-container
COPY docker/production/8.3/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY docker/production/8.3/php.ini /etc/php/8.3/cli/conf.d/99-sail.ini
COPY docker/production/8.3/php-fpm.ini /etc/php/8.3/fpm/conf.d/99-sail.ini
COPY docker/production/8.3/www.conf /etc/php/8.3/fpm/pool.d/www.conf
COPY docker/production/8.3/nginx.conf /etc/nginx/sites-available/default

RUN chmod +x /usr/local/bin/start-container \
    && ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default

EXPOSE 80

ENTRYPOINT ["start-container"]
