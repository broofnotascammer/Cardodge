FROM node:20.10.0 

WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install application dependencies
RUN npm install --omit=dev

# Copy the rest of your application code
COPY . .

EXPOSE 10000

CMD [ "npm", "start" ]
