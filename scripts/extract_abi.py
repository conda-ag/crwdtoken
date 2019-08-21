import json
import os, datetime
import argparse, sys

#parse arguments
parser=argparse.ArgumentParser()
parser.add_argument('--outputdir', help='Path where ABIs should be stored')
parser.add_argument('--jsonfile', help='JSON filename of compiled contract in build folder')
args=parser.parse_args()

#generate abi dir
jsonfileName = args.jsonfile

def ensure_dir_exists(dir):
    try:
        os.makedirs(dir)
    except:
        pass #python2 compatibile fallback if folder exists


def get_truffle_file_json(jsonfileName):
    contractFilePath=os.path.join(os.getcwd(), "build", "contracts", jsonfileName)
    print(contractFilePath)
    truffleFileJson = json.load(open(contractFilePath))
    return truffleFileJson

def write_to_output(jsonfileName, data, outDir):
    ensure_dir_exists(outDir) #NEW position
    with open(os.path.join(outDir, jsonfileName.replace(".json", "_abi.json")), "w") as outfile:
        json.dump(data, outfile)

def extract(targetDir, jsonfileName):
    truffleFileJson = get_truffle_file_json(jsonfileName)
    extracted = truffleFileJson["abi"]
    write_to_output(jsonfileName, extracted, targetDir)

extract("build", jsonfileName)