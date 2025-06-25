FROM node:lts

# install the application
WORKDIR /app
COPY package.json package-lock.json ./
COPY . .
RUN npm ci

# PORT can be change in .env
EXPOSE ${PORT}

# build and start
RUN npm run build

# start
CMD ["npm", "run", "dev"]