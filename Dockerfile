FROM public.ecr.aws/docker/library/node:lts-alpine3.16 AS deps

RUN apk add --no-cache libc6-compat
WORKDIR /usr/src/app

COPY package.json package-lock.json ./
RUN npm ci

FROM public.ecr.aws/docker/library/node:lts-alpine3.16 AS runner
WORKDIR /usr/src/app

COPY --from=deps /usr/src/app/node_modules ./node_modules

COPY . .

RUN npm run generate:prisma

CMD ["npm", "run", "dev"]