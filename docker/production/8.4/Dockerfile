FROM ubuntu:22.04 AS builder

ARG NODE_VERSION=20
WORKDIR /app

ENV DEBIAN_FRONTEND=noninteractive

# Instalar PHP e Composer (necessário para Ziggy e dependências)
RUN apt-get update \
    && mkdir -p /etc/apt/keyrings \
    && apt-get install -y curl ca-certificates gnupg zip unzip git libpng-dev \
    && curl -sS 'https://keyserver.ubuntu.com/pks/lookup?op=get&search=0x14aa40ec0831756756d7f66c4f4ea0aae5267a6c' | gpg --dearmor | tee /etc/apt/keyrings/ppa_ondrej_php.gpg > /dev/null \
    && echo "deb [signed-by=/etc/apt/keyrings/ppa_ondrej_php.gpg] https://ppa.launchpadcontent.net/ondrej/php/ubuntu jammy main" > /etc/apt/sources.list.d/ppa_ondrej_php.list \
    && apt-get update \
    && apt-get install -y php8.3-cli php8.3-mbstring php8.3-xml php8.3-zip php8.3-curl php8.3-gd \
    && curl -sLS https://getcomposer.org/installer | php -- --install-dir=/usr/bin/ --filename=composer \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copiar composer.json e composer.lock primeiro
COPY app/composer.json app/composer.lock ./

# Instalar dependências do Composer (incluindo Ziggy)
RUN composer install --no-scripts --no-autoloader --no-dev --prefer-dist

# Copiar o restante do código Laravel necessário para o build
COPY app/app ./app
COPY app/bootstrap ./bootstrap
COPY app/config ./config
COPY app/database ./database
COPY app/routes ./routes
COPY app/artisan ./artisan

# Gerar autoload do Composer
RUN composer dump-autoload --optimize --no-dev

# Instalar Node.js
RUN curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_VERSION.x nodistro main" > /etc/apt/sources.list.d/nodesource.list \
    && apt-get update \
    && apt-get install -y nodejs \
    && npm install -g npm

# Copiar package.json e package-lock.json
COPY app/package*.json ./

# Instalar dependências do Node (incluindo devDependencies para o build)
RUN npm ci --no-audit --no-fund

# Instalar Chrome via Puppeteer (garante versão compatível)
RUN npx puppeteer browsers install chrome

# Copiar código fonte do frontend
COPY app/resources ./resources
COPY app/public ./public
COPY app/vite.config.ts ./
#COPY postcss.config.js* ./
#COPY tailwind.config.js* ./
#COPY jsconfig.json* ./
COPY tsconfig.json* ./

# Criar .env mínimo e diretórios necessários para o artisan funcionar
RUN mkdir -p storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && chmod -R 777 storage bootstrap/cache \
    && echo "APP_KEY=base64:$(head -c 32 /dev/urandom | base64)" > .env \
    && echo "VIEW_COMPILED_PATH=/app/storage/framework/views" >> .env

# Build do React/Vite - agora com vendor disponível
RUN npm run build

# ==============================================
# Imagem de produção
# ==============================================
FROM ubuntu:22.04

LABEL maintainer="Taylor Otwell"

ARG WWWGROUP=1000
ARG POSTGRES_VERSION=15
ARG NODE_VERSION=20

WORKDIR /var/www/html

ENV DEBIAN_FRONTEND=noninteractive
ENV TZ="America/Porto_Velho"
ENV PUPPETEER_CACHE_DIR=/home/sail/.cache/puppeteer

RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Instalar dependências básicas
RUN apt-get update \
    && mkdir -p /etc/apt/keyrings \
    && apt-get install -y gnupg gosu curl ca-certificates zip unzip git supervisor sqlite3 libcap2-bin libpng-dev dnsutils librsvg2-bin ffmpeg nano nginx \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Adicionar repositório PHP e instalar
RUN curl -sS 'https://keyserver.ubuntu.com/pks/lookup?op=get&search=0x14aa40ec0831756756d7f66c4f4ea0aae5267a6c' | gpg --dearmor | tee /etc/apt/keyrings/ppa_ondrej_php.gpg > /dev/null \
    && echo "deb [signed-by=/etc/apt/keyrings/ppa_ondrej_php.gpg] https://ppa.launchpadcontent.net/ondrej/php/ubuntu jammy main" > /etc/apt/sources.list.d/ppa_ondrej_php.list \
    && apt-get update \
    && apt-get install -y php8.3-cli php8.3-fpm php8.3-dev \
       php8.3-pgsql php8.3-sqlite3 php8.3-gd php8.3-curl \
       php8.3-imap php8.3-mysql php8.3-mbstring \
       php8.3-xml php8.3-zip php8.3-bcmath php8.3-soap \
       php8.3-intl php8.3-readline php8.3-ldap \
       php8.3-msgpack php8.3-igbinary php8.3-redis \
       php8.3-memcached php8.3-imagick php8.3-opcache \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Instalar Composer
RUN curl -sLS https://getcomposer.org/installer | php -- --install-dir=/usr/bin/ --filename=composer

# Adicionar repositório PostgreSQL e instalar clientes de banco
RUN curl -sS https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor | tee /etc/apt/keyrings/pgdg.gpg >/dev/null \
    && echo "deb [signed-by=/etc/apt/keyrings/pgdg.gpg] http://apt.postgresql.org/pub/repos/apt jammy-pgdg main" > /etc/apt/sources.list.d/pgdg.list \
    && apt-get update \
    && apt-get install -y mysql-client postgresql-client-$POSTGRES_VERSION \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Instalar Node.js
RUN curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_VERSION.x nodistro main" > /etc/apt/sources.list.d/nodesource.list \
    && apt-get update \
    && apt-get install -y nodejs \
    && npm install -g npm \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Instalar dependências do Chromium/Puppeteer (sem o chromium-browser que é só um wrapper snap)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
       libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
       libgbm1 libpango-1.0-0 libcairo2 libasound2 libatspi2.0-0 \
       fonts-liberation xdg-utils libxshmfence1 libglib2.0-0 \
       libx11-6 libx11-xcb1 libxcb1 libxext6 libxrender1 \
    && apt-get -y autoremove \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Criar usuário sail
RUN groupadd --force -g $WWWGROUP sail \
    && useradd -ms /bin/bash --no-user-group -g $WWWGROUP -u 1337 sail

# Criar diretórios necessários do Laravel
RUN mkdir -p /var/www/html/storage/logs \
    && mkdir -p /var/www/html/storage/framework/cache \
    && mkdir -p /var/www/html/storage/framework/sessions \
    && mkdir -p /var/www/html/storage/framework/views \
    && mkdir -p /var/www/html/storage/app/public \
    && mkdir -p /var/www/html/bootstrap/cache \
    && mkdir -p /var/www/html/public/build \
    && mkdir -p /run/php

# Copiar composer.json e composer.lock primeiro (cache layer)
COPY --chown=sail:sail app/composer.json app/composer.lock /var/www/html/

# Instalar dependências do Composer (apenas produção, sem dev)
RUN cd /var/www/html \
    && composer install --no-dev --no-scripts --no-autoloader --no-interaction --prefer-dist \
    && chown -R sail:sail /var/www/html/vendor

# Copiar todo o código da aplicação Laravel (somente o diretório app/ do projeto, que é a raiz do Laravel)
COPY --chown=sail:sail app/ /var/www/html

# Remover hot file do Vite caso tenha vindo do host (evita apontar para :5173 em produção)
RUN rm -f /var/www/html/public/hot

# Copiar os assets buildados do React (public/build) do estágio builder
COPY --from=builder --chown=sail:sail /app/public/build /var/www/html/public/build

# Copiar node_modules do builder (necessário para Browsershot/Puppeteer)
COPY --from=builder --chown=sail:sail /app/node_modules /var/www/html/node_modules

# Copiar cache do Puppeteer (Chrome instalado) do builder para o usuário sail
RUN mkdir -p /home/sail/.cache
COPY --from=builder --chown=sail:sail /root/.cache/puppeteer /home/sail/.cache/puppeteer

# Garantir permissões corretas do cache do Puppeteer
RUN chown -R sail:sail /home/sail/.cache && chmod -R 755 /home/sail/.cache

# Finalizar instalação do Composer e gerar autoload otimizado
RUN cd /var/www/html \
    && git config --global --add safe.directory /var/www/html \
    && composer dump-autoload --optimize --no-dev \
    && chown -R sail:sail /var/www/html

# Criar link simbólico do storage (se necessário)
RUN if [ ! -L /var/www/html/public/storage ]; then \
        ln -s /var/www/html/storage/app/public /var/www/html/public/storage; \
    fi

# Otimizações do Laravel (apenas caches que não precisam de BD)
# OBS: config:cache e route:cache serão feitos no start-container
RUN cd /var/www/html \
    && php artisan view:cache \
    && php artisan event:cache

# Ajustar permissões finais
RUN chmod -R 775 /var/www/html/storage \
    && chmod -R 775 /var/www/html/bootstrap/cache \
    && chmod -R 755 /var/www/html/public/build \
    && chown -R sail:sail /var/www/html/storage \
    && chown -R sail:sail /var/www/html/bootstrap/cache

COPY docker/production/8.4/nginx.conf /etc/nginx/sites-enabled/default
COPY docker/production/8.4/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY docker/production/8.4/entrypoint.sh /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]

# Copiar arquivos de configuração
#COPY docker/production/8.3/start-container /usr/local/bin/start-container
#COPY docker/production/8.3/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
#COPY docker/production/8.3/php.ini /etc/php/8.3/cli/conf.d/99-sail.ini
#COPY docker/production/8.3/php-fpm.ini /etc/php/8.3/fpm/conf.d/99-sail.ini
#COPY docker/production/8.3/www.conf /etc/php/8.3/fpm/pool.d/www.conf
#COPY docker/production/8.3/nginx.conf /etc/nginx/sites-available/default
#
#RUN chmod +x /usr/local/bin/start-container
#
#EXPOSE 80
#
#ENTRYPOINT ["start-container"]
