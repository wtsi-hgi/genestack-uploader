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

import logging
import os

import botocore
import paramiko
from uploadtogenestack import S3BucketUtils, genestackassist

import config


class S3PublicPolicy:
    """
        Context manager for the access policy
        on the S3 buckets

        When opened, sets a public policy
        When closed, sets a GS VM only policy
    """

    def __init__(self, s3_bucket: S3BucketUtils):
        self.s3_bucket: S3BucketUtils = s3_bucket
        self.logger = logging.getLogger(self.__class__.__name__)
        self.logger.setLevel(config.LOG_LEVEL)

    def __enter__(self):
        self.logger.info("setting S3 public policy")
        try:
            self.s3_bucket.delete_bucket_policy(
                key_filename=f"{os.environ['HOME']}/.ssh/id_rsa_genestack")
            self.s3_bucket.set_public_policy()
        except paramiko.PasswordRequiredException:
            self.logger.warning(
                "can't change the bucket policy. the upload might work. but probably not.")

    def __exit__(self, *_):
        self.logger.info("setting S3 private policy")
        try:
            self.s3_bucket.set_vm_only_policy()
        except (botocore.exceptions.ClientError, genestackassist.BucketPermissionDenied):
            # VM Only Policy is Already Set
            self.logger.info("VM Only policy already set")
