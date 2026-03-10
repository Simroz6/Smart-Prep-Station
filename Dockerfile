# Use the official Node.js image as the base image
FROM node:24

# Set the working directory in the container
WORKDIR /api

# Copy the application files into the working directory
COPY . /api

# Install the application dependencies
RUN npm install

# Build the React application
RUN npm run build

# Expose port 3000
EXPOSE 3000

# Define the entry point for the container
CMD ["npm", "start"]

# Use the official Node.js image as the base image
FROM node:24

# Set the working directory in the container
WORKDIR /api

# Copy the application files into the working directory
COPY . /api

# Install the application dependencies
RUN npm install

# Build the React application
RUN npm run build

# Expose port 3000
EXPOSE 3000

# Define the entry point for the container
CMD ["npm", "start"]

