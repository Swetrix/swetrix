# Stage 1
FROM node:22-alpine as base

# Install all node_modules, including dev dependencies
FROM base as deps

RUN mkdir /app
WORKDIR /app

ADD package.json ./
RUN yarn install --production=false

# Setup production node_modules
FROM base as production-deps

RUN mkdir /app
WORKDIR /app

COPY --from=deps /app/node_modules /app/node_modules
ADD package.json ./

# Build the app
FROM base as build

ENV NODE_ENV=production \
    SELFHOSTED=true

RUN mkdir /app
WORKDIR /app

COPY --from=deps /app/node_modules /app/node_modules

ADD . .
RUN npm run build

# Finally, build the production image with minimal footprint
FROM base

ENV NODE_ENV=production \
    SELFHOSTED=true

RUN mkdir /app
WORKDIR /app

COPY --from=production-deps /app/node_modules /app/node_modules

COPY --from=build /app/build /app/build
COPY --from=build /app/public /app/public
ADD . .

CMD ["npm", "run", "start"]
