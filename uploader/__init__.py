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
import json
import logging
import multiprocessing
import typing as T
import uuid
from uploader.common import JobStatus
from uploader.signal import new_signal

from uploader.study import new_study

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
class JobType(enum.Enum):
    Study = new_study
    Signal = new_signal

class GenestackUploadJob:
    """a representaion of an uploading job"""

    env: T.Dict[str, T.Any] = {}

    @classmethod
    def add_env(cls, key: str, val: T.Any) -> None:
        cls.env[key] = val

    def __init__(self, job_type: JobType, token: str, body: T.Dict[str, T.Any], study_id: str = None) -> None:
        self._status: JobStatus = JobStatus.Queued
        self._start_time: T.Optional[datetime.datetime] = None
        self._end_time: T.Optional[datetime.datetime] = None
        self._output: T.Any = None

        self._job_type = job_type
        self._token = token
        self._body = body
        self._study_id = study_id

        self._uuid = uuid.uuid4()

        self.logger = logging.getLogger(str(self.uuid))
        self.logger.setLevel(logging.INFO)

        self._write_to_file()

    def start(self) -> None:
        self.logger.info("starting job")
        if self.status != JobStatus.Queued:
            raise JobAlreadyStartedError

        self.status = JobStatus.Running
        self._start_time = datetime.datetime.now()
        self._write_to_file()

        finish_status, output = self._job_type(self._token, self._body, self.logger, self.__class__.env, self._study_id) # type: ignore
        self.finish(finish_status, output)

    def finish(self, state: JobStatus, output: T.Any) -> None:
        self.status = state
        self._output = output
        self._end_time = datetime.datetime.now()
        self._write_to_file()

    @property
    def uuid(self) -> uuid.UUID:
        return self._uuid

    @property
    def status(self) -> JobStatus:
        return self._status

    @status.setter
    def status(self, status: JobStatus) -> None:
        if isinstance(status, JobStatus): # type: ignore
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

    @property
    def dict(self) -> T.Dict[str, T.Any]:
        data = {
            "status": self.status.value,
        }

        if self.status != JobStatus.Queued:
            data["startTime"] = self.start_time.isoformat()

        if self.status in {JobStatus.Failed, JobStatus.Completed}:
            data["endTime"] = self.end_time.isoformat()
            data["output"] = self.output

        return data

    def _write_to_file(self):
        with open(f".jobs/{self._uuid}", "w") as f:
            print(json.dumps(self.dict))
            f.write(json.dumps(self.dict))

    @property
    def json(self) -> T.Dict[str, T.Any]:
        with open(f".jobs/{self._uuid}") as f:
            return json.loads(f.read())

def job_handler(jobs_queue: "multiprocessing.Queue[GenestackUploadJob]") -> None:
    while True:
        job = jobs_queue.get(block=True)
        job.start()