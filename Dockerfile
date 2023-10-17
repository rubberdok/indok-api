FROM public.ecr.aws/docker/library/node:lts AS deps

WORKDIR /usr/src/app

COPY package.json package-lock.json ./
RUN npm ci

FROM public.ecr.aws/docker/library/node:lts AS runner
WORKDIR /usr/src/app

COPY --from=deps /usr/src/app/node_modules ./node_modules

COPY . .

RUN npm run generate:prisma

CMD ["npm", "run", "dev"]