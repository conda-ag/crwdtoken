#!/bin/bash

for file in ../build/contracts/*.json; do
  web3j truffle generate $file -o ../build/javaWrapper -p at.conda.contract
done
