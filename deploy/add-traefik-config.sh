#!/bin/bash

# Backup
cp /etc/easypanel/traefik/config/main.yaml /etc/easypanel/traefik/config/main.yaml.bak

# Add entrega routes to main.yaml
jq '.http.routers += {
  "http-entrega": {
    "service": "entrega-service",
    "rule": "Host(`entregapramim.impulsiodigital.com`)",
    "priority": 10,
    "middlewares": ["redirect-to-https", "bad-gateway-error-page"],
    "entryPoints": ["http"]
  },
  "https-entrega": {
    "service": "entrega-service",
    "rule": "Host(`entregapramim.impulsiodigital.com`)",
    "priority": 10,
    "middlewares": ["bad-gateway-error-page"],
    "tls": {
      "certResolver": "letsencrypt",
      "domains": [{"main": "entregapramim.impulsiodigital.com"}]
    },
    "entryPoints": ["https"]
  }
} | .http.services += {
  "entrega-service": {
    "loadBalancer": {
      "servers": [{"url": "http://172.17.0.1:3001"}],
      "passHostHeader": true
    }
  }
}' /etc/easypanel/traefik/config/main.yaml.bak > /etc/easypanel/traefik/config/main.yaml

echo "Configuracao adicionada com sucesso!"
