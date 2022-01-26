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
import os
import typing as T
import uuid
from uploader.common import FINISHED_STATUSES, JobStatus
from uploader.signal import new_signal

from uploader.study import new_study

LogLevel = T.Union[str, int]

_str_to_log: T.Dict[str, LogLevel] = {
    "DEBUG": logging.DEBUG,
    "INFO": logging.INFO,
    "WARNING": logging.WARNING,
    "ERROR": logging.ERROR,
    "CRITICAL": logging.CRITICAL
}

LOG_LEVEL: LogLevel = _str_to_log[os.getenv("LOG_LEVEL", default="INFO")]

try:
    JOB_EXPIRY_HOURS: int = int(os.getenv("JOB_EXPIRY_HOURS", default="168"))
except ValueError as err:
    raise ValueError("JOB_EXPIRY_HOURS env variable must be integer") from err


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
    """JobType enum represents whether the job is for
    creating a study or signal dataset, and the value is
    the function to call"""

    Study = new_study  # pylint: disable=invalid-name
    Signal = new_signal  # pylint: disable=invalid-name


_str_to_status: T.Dict[str, JobStatus] = {
    "QUEUED": JobStatus.Queued,
    "RUNNING": JobStatus.Running,
    "COMPLETED": JobStatus.Completed,
    "FAILED": JobStatus.Failed
}


class GenestackUploadJob:
    """a representaion of an uploading job"""

    env: T.Dict[str, T.Any] = {}

    @classmethod
    def add_env(cls, key: str, val: T.Any) -> None:
        """add a key-value pair to the environment held
        by all jobs

        Args:
            key: str
            val: Any
        """
        cls.env[key] = val

    def __init__(
        self,
        job_type: JobType,
        token: str,
        body: T.Dict[str, T.Any],
        study_id: T.Optional[str] = None
    ) -> None:

        self._status: JobStatus = JobStatus.Queued
        self._start_time: T.Optional[datetime.datetime] = None
        self._end_time: T.Optional[datetime.datetime] = None
        self._output: T.Any = None

        self._job_type = job_type
        self._token = token
        self._body = body
        self._study_id = study_id

        self._uuid = uuid.uuid4()

        self.logger: logging.Logger

        self._write_to_file()

    def start(self) -> None:
        """start the job

        note: will block until job is done
        """
        # loggers defined here, so in same process as
        # where the logging will happen
        self.logger = logging.getLogger(str(self.uuid))
        self.logger.setLevel(LOG_LEVEL)
        self.logger.info("starting job")

        if self.status != JobStatus.Queued:
            raise JobAlreadyStartedError

        self.status = JobStatus.Running
        self._start_time = datetime.datetime.now()
        self._write_to_file()

        finish_status: JobStatus
        finish_status, output = self._job_type(  # type: ignore
            self._token, self._body, self.logger, self.__class__.env, self._study_id)

        self.logger.info(f"job done: {finish_status.value}: {output}")
        self.finish(finish_status, output)

    def finish(self, state: JobStatus, output: T.Any) -> None:
        """update the internal states of the job when it
        finishes

        Args:
            state: JobStatus - the state the job finishes in
            output: Any - the output of the job for the user
        """
        self.status = state
        self._output = output
        self._end_time = datetime.datetime.now()
        self._write_to_file()

    @property
    def uuid(self) -> uuid.UUID:
        """returns the job's UUID"""
        return self._uuid

    @property
    def status(self) -> JobStatus:
        """returns the job's status"""
        return self._status

    @status.setter
    def status(self, status: JobStatus) -> None:
        if isinstance(status, JobStatus):  # type: ignore
            if self.status == JobStatus.Queued and status != JobStatus.Running:
                raise InvalidJobStatusProgressionError

            if self.status == JobStatus.Running and status not in FINISHED_STATUSES:
                raise InvalidJobStatusProgressionError

            if self.status in {JobStatus.Completed, JobStatus.Failed}:
                raise InvalidJobStatusProgressionError

            self._status = status
        else:
            raise TypeError(status)

    @property
    def start_time(self) -> datetime.datetime:
        """if the job has a start time, return it,
        otherwise raise JobNotStartedError"""
        if self._start_time:
            return self._start_time

        raise JobNotStartedError

    @property
    def end_time(self) -> datetime.datetime:
        """if the job has an end time, return it,
        otherwise raise JobNotFinishedError"""
        if self._end_time:
            return self._end_time

        raise JobNotFinishedError

    @property
    def output(self) -> T.Any:
        """if the job has finished, return it,
        otherwise raise JobNotFinishedError"""
        if self.status in FINISHED_STATUSES:
            return self._output

        raise JobNotFinishedError

    @property
    def dict(self) -> T.Dict[str, T.Any]:
        """return the job's information as
        a dictionary

        Note: when used in multiprocessing, if
        you call this from another process, you'll
        be calling the wrong object, and this won't be
        correct. use `json`"""

        data = {
            "status": self.status.value,
        }

        if self.status != JobStatus.Queued:
            data["startTime"] = self.start_time.isoformat()

        if self.status in FINISHED_STATUSES:
            data["endTime"] = self.end_time.isoformat()
            data["output"] = self.output

        return data

    def _write_to_file(self):
        """write the job's information to the file
        .jobs/{uuid} as JSON"""
        try:
            with open(f".jobs/{self._uuid}", "w", encoding="utf-8") as out_file:
                out_file.write(json.dumps(self.dict))
        except FileNotFoundError:
            os.mkdir(".jobs")
            self._write_to_file()

    @property
    def json(self) -> T.Dict[str, T.Any]:
        """read the job's information from the
        file written using _write_to_file

        Returns: Dict[str, Any]

        This method is preferred over `dict`
        as it reads from the file, so will work
        across objects, so long as they have the
        same UUID"""
        with open(f".jobs/{self._uuid}", encoding="utf-8") as in_file:
            return json.loads(in_file.read())

    @property
    def expired(self) -> bool:
        """read from the jobs JSON and see if
        the job finished more than a week ago.
        if so, return True and delete the job
        file

        Returns:
            bool: did the job finish more than a week ago
        """
        data: T.Dict[str, T.Any] = self.json
        self._status = _str_to_status[data["status"]]
        if self.status in FINISHED_STATUSES:
            self._end_time = datetime.datetime.fromisoformat(data["endTime"])
            if datetime.datetime.now() - self.end_time > datetime.timedelta(hours=JOB_EXPIRY_HOURS):
                os.remove(f".jobs/{self._uuid}")
                return True

        return False


def job_handler(jobs_queue: "multiprocessing.Queue[GenestackUploadJob]") -> None:
    """job_handler runs a loop to block
    until it gets a job on the queue, then
    starts that job

    Args:
        jobs_queue: multiprocessing.Queue[GenestackUploadJob]

    Note: this waits for the current job to finish
    before starting the next
    """
    while True:
        job = jobs_queue.get(block=True)
        job.start()
