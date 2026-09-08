# Imagen oficial de Node.js ligera basada en Alpine Linux
FROM node:20-alpine

# Directorio de trabajo de la aplicación
WORKDIR /app

# Copiar archivos del proyecto
COPY package.json ./
COPY server.js ./
COPY index.html ./
COPY css/ ./css/
COPY js/ ./js/

# Crear volumen/directorio para datos persistentes
RUN mkdir -p /app/data
VOLUME ["/app/data"]

# Exponer puerto HTTP
EXPOSE 3000

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3000

# Comando para iniciar la aplicación
CMD ["node", "server.js"]
