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

import datetime
import enum
import multiprocessing
import typing as T

class InvalidJobStatusProgressionError(Exception):
    """raised when the update to a job status is invalid
    queued jobs must be set to running
    running jobs must be set to completed or failed
    completed or failed jobs can't be changed"""

class JobAlreadyStartedError(Exception):
    """raised if an already started job is called to start"""

class JobNotStartedError(Exception):
    """raised when a job hasn't been started yet and
    we try to get info on it assuming it's started"""

class JobNotFinishedError(Exception):
    """raised when a job hasn't finished and we try
    to get info from it assuming it's finished"""

class JobTypes(enum.Enum):
    Study = ...
    Signal = ...

class JobStatus(enum.Enum):
    Queued = "QUEUED"
    Running = "RUNNING"
    Completed = "COMPLETED"
    Failed = "FAILED"

class GenestackUploadJob:
    """a representaion of an uploading job"""

    def __init__(self) -> None:
        self._status: JobStatus = JobStatus.Queued
        self._start_time: T.Optional[datetime.datetime] = None
        self._end_time: T.Optional[datetime.datetime] = None
        self._output: T.Any = None

    def start(self) -> None:
        if self.status != JobStatus.Queued:
            raise JobAlreadyStartedError

        self.status = JobStatus.Running
        self._start_time = datetime.datetime.now()

        # Actually run the job

    def finish(self, state: JobStatus, output: T.Any) -> None:
        self.status = state
        self._output = output
        self._end_time = datetime.datetime.now()

    @property
    def status(self) -> JobStatus:
        return self._status

    @status.setter
    def status(self, status: JobStatus) -> None:
        if isinstance(status, JobStatus):
            if self.status == JobStatus.Queued and status != JobStatus.Running:
                raise InvalidJobStatusProgressionError

            if self.status == JobStatus.Running and status not in {JobStatus.Completed, JobStatus.Failed}:
                raise InvalidJobStatusProgressionError

            if self.status in {JobStatus.Completed, JobStatus.Failed}:
                raise InvalidJobStatusProgressionError

            self._status = status
        else:
            raise TypeError(status)

    @property
    def start_time(self) -> datetime.datetime:
        if self._start_time:
            return self._start_time

        raise JobNotStartedError

    @property
    def end_time(self) -> datetime.datetime:
        if self._end_time:
            return self._end_time

        raise JobNotFinishedError

    @property
    def output(self) -> T.Any:
        if self.status in {JobStatus.Completed, JobStatus.Failed}:
            return self._output

        raise JobNotFinishedError

def job_handler(jobs_queue: "multiprocessing.Queue[GenestackUploadJob]") -> None:
    while True:
        job: GenestackUploadJob = jobs_queue.get(block=True)
        job.start()