FROM public.ecr.aws/docker/library/node:lts AS deps

WORKDIR /usr/src/app

COPY package.json package-lock.json ./

RUN npm i

COPY . .

RUN npm run generate:prisma

CMD ["npm", "run", "dev"]
