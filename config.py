"""
Genestack Uploader
A HTTP server providing an API and a frontend for easy uploading to Genestack

Copyright (C) 2021, 2022 Genome Research Limited

Author: Michael Grace <mg38@sanger.ac.uk>

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
"""

import os
import typing as T

import uploader.common

# Configuration Settings

VERSION = "2.0"

# this is the end of the base url, identical to frontend/.env
# this only affects the swagger ui
BASE_URL = "/genestack-uploader"

GENESTACK_SERVER = os.environ["GSSERVER"]
assert GENESTACK_SERVER in ["default", "qc"]

SERVER_ENDPOINT = f"https://genestack{'-qc' if GENESTACK_SERVER == 'qc' else ''}.sanger.ac.uk"

LogLevel = T.Union[str, int]

LOG_LEVEL: LogLevel = uploader.common.LOG_LEVEL
