FROM node:24-alpine
WORKDIR /app
COPY package.json ./
COPY server ./server
COPY public ./public
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8787 DATA_DIR=/data
RUN mkdir /data && chown node:node /data
USER node
EXPOSE 8787
CMD ["node", "server/index.mjs"]
