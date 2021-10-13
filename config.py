"""
    Configuration Settings
"""

VERSION = "0.0.1"
GENESTACK_SERVER = "qc"
SERVER_ENDPOINT = f"https://genestack{'-qc' if GENESTACK_SERVER == 'qc' else ''}.sanger.ac.uk"
