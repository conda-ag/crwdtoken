
FROM node
ADD . /contracts
RUN cd /contracts; npm install
WORKDIR /contracts
CMD ["npm", "run", "test-docker"]
