"""
Genestack Uploader
A HTTP server providing an API and a frontend for easy uploading to Genestack

Copyright (C) 2022 Genome Research Limited

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

import enum
import logging
import os
import typing as T

LogLevel = T.Union[str, int]

_str_to_log: T.Dict[str, LogLevel] = {
    "DEBUG": logging.DEBUG,
    "INFO": logging.INFO,
    "WARNING": logging.WARNING,
    "ERROR": logging.ERROR,
    "CRITICAL": logging.CRITICAL
}

LOG_LEVEL: LogLevel = _str_to_log[os.getenv("LOG_LEVEL", default="INFO")]


class JobStatus(enum.Enum):
    """JobStatus is an enum of the
    various states a job can be in,
    queued, running, completed, failed"""

    Queued = "QUEUED"  # pylint: disable=invalid-name
    Running = "RUNNING"  # pylint: disable=invalid-name
    Completed = "COMPLETED"  # pylint: disable=invalid-name
    Failed = "FAILED"  # pylint: disable=invalid-name


FINISHED_STATUSES: T.Set[JobStatus] = {JobStatus.Failed, JobStatus.Completed}
