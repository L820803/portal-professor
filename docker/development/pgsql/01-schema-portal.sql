-- Executado apenas na primeira inicialização do volume.
-- Mesmo schema do legado; as tabelas são criadas pelas migrations do Laravel.
CREATE SCHEMA IF NOT EXISTS portal;
ALTER ROLE CURRENT_USER SET search_path TO portal, public;
