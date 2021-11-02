"""
    Configuration Settings
"""
import os

VERSION = "0.6"

GENESTACK_SERVER = os.environ["GSSERVER"]
assert GENESTACK_SERVER in ["default", "qc"]

SERVER_ENDPOINT = f"https://genestack{'-qc' if GENESTACK_SERVER == 'qc' else ''}.sanger.ac.uk"
