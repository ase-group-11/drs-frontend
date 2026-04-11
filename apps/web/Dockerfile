FROM node:16-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG REACT_APP_API_URL
ARG REACT_APP_HEALTH_URL
ARG REACT_APP_MAPBOX_TOKEN
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_HEALTH_URL=$REACT_APP_HEALTH_URL
ENV REACT_APP_MAPBOX_TOKEN=$REACT_APP_MAPBOX_TOKEN
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.k8s.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
