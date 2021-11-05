"""
    Context manager for the access policy
    on the S3 buckets
"""

import os

import botocore
import paramiko
from uploadtogenestack import S3BucketUtils


class S3PublicPolicy:
    """
        Context manager for the access policy
        on the S3 buckets

        When opened, sets a public policy
        When closed, sets a GS VM only policy
    """

    def __init__(self, s3_bucket: S3BucketUtils):
        self.s3_bucket: S3BucketUtils = s3_bucket

    def __enter__(self):
        try:
            self.s3_bucket.delete_bucket_policy(
                key_filename=f"{os.environ['HOME']}/.ssh/id_rsa_genestack")
            self.s3_bucket.set_public_policy()
        except paramiko.PasswordRequiredException:
            print(
                "can't change the bucket policy. the upload might work. but probably not.")

    def __exit__(self, *_):
        try:
            self.s3_bucket.set_vm_only_policy()
        except botocore.exceptions.ClientError:
            # VM Only Policy is Already Set
            pass
