# crwdtoken
```
sudo npm install -g truffle@5.0.22
sudo npm install -g ganache-cli
npm install .
```

start ganache-cli with
```
./scripts/start_ganache.sh
```

run tests with
```
npm test
```
## Docker

To run the tests in a docker container:

`docker-compose build`

`docker-compose up -d`

`docker-compose logs -f contracts`

Or do all in one line:

`docker-compose down && docker-compose build && docker-compose up -d && docker-compose logs -f contracts`

To cleanup run:

`docker-compose down`