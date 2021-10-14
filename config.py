"""
    Configuration Settings
"""
import os

VERSION = "0.0.1"

GENESTACK_SERVER = os.environ["GS-SERVER"]
assert GENESTACK_SERVER in ["default", "qc"]

SERVER_ENDPOINT = f"https://genestack{'-qc' if GENESTACK_SERVER == 'qc' else ''}.sanger.ac.uk"
