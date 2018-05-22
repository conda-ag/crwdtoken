#!/bin/bash

# todo: delete ganache persistent database every time before starting ganache
# it seems this version does not know about --db flag to force db path.
# Avoid using account 0, it is default account to send messages from when running tests.
rm -rf .myganache
mkdir .myganache
# Use e.g. --gasLimit 8000000 to test higher gas limits.
ganache-cli -d -m "rebel year fine public bright armor sugar biology federal morning ozone scene" \
     --db .myganache \
     --account="0x8355a2b28d30a83e9cb84a47a82e2feb2ccb380d7db55d76cd00b82bf765f600,100000000000000000000" \
     --account="0x57e577bbd7e9b292f8cf64efdad804aa7a2dc3f4ee4674270667f96a43dfed81,100000000000000000000" \
     --account="0x39ef678f276b2b51dda8952b8f83b9551c26bee9a62876da82f1adfc678ddcd7,100000000000000000000" \
     --account="0x21ecc1463540022b858d9cbdabb5843efaed8e677119363c4e823554c89fc74a,100000000000000000000" \
     --account="0xda7200eff1e4299feb4d396e04180cf25c3634478527c201009ab1af9676942d,100000000000000000000" \
     --account="0x2a8e0d9fae83481c9982caf462328ea6f0db3150a9c10ac08f782e09d84ff097,100000000000000000000" \
     --account="0x4152e2c01aa4208741caf7e296a4f4224122a4e00449acef8ada7aa15e9e694b,100000000000000000000" \
     --account="0x4267142e9b10836fb358ae82599b1fffc28944b7a4885b35114e7c6ec77c345a,100000000000000000000" \
     --account="0x4592292b6f62dab3ed524a23890d537206197a3c1dbfbed3eec63f000738ecfe,100000000000000000000" \
     --account="0x57dd986e631530090525cdc560f75869dc449dc7beb2f12003de594818e03baa,1000000000000000000010001471238800000000000" \
     --account="0x39ea1f98a8ad35dd1b82e1c6eb583d86a7d904e375930ca7aefe0f7529e0c1da,100000000000000000000" \
     --account="0x821f93cd3f080b576e4b5d991e07c1a655d3fd942d0a3806ccffcd72c9d3ee68,100000000000000000000" \
      -g 1 


# previous account 4 balances
#      --account="0xda7200eff1e4299feb4d396e04180cf25c3634478527c201009ab1af9676942d,100010000000000000000000" \

