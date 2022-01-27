/**
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
*/

import { useEffect, useState } from "react";
import { QuestionCircle } from "react-bootstrap-icons";
import { apiRequest } from "./api";
import { HelpModal } from "./HelpModal";

export const JobStatus = ({ jobID }) => {
  const [successfulRequest, setSuccessfulRequest] = useState("");
  const [apiError, setApiError] = useState("");
  const [studyAccession, setStudyAccession] = useState("");
  const [showModal, setShowModal] = useState(false);

  const updateJobState = (jobID, refreshID) => {
    apiRequest(`jobs/${jobID}`).then((t) => {
      setSuccessfulRequest(t.data.status);

      if (t.data.status === "FAILED") {
        setApiError(JSON.stringify(t.output));
        clearInterval(refreshID);
      } else if (t.data.status === "COMPLETED") {
        setStudyAccession(t.data.output.studyAccession);
        clearInterval(refreshID);
      }
    });
  };

  useEffect(() => {
    setApiError("");
    setStudyAccession("");
    updateJobState(jobID, null);
    let refreshID = setInterval(() => {
      updateJobState(jobID, refreshID);
    }, 20000);
  }, [jobID]);

  return (
    <div>
      <HelpModal
        header="Jobs"
        helpText={`You have submitted an upload job 
                which has been given this ID. You can send 
                a request to this endpoint
                to get information about the state of the job.`}
        code={`${process.env.NEXT_PUBLIC_HOST}/api/jobs/${jobID}`}
        show={showModal}
        handleClose={() => {
          setShowModal(false);
        }}
      />
      <b>Job ID:</b> {jobID}{" "}
      <QuestionCircle
        role="button"
        onClick={() => {
          setShowModal(true);
        }}
      />
      {successfulRequest == "QUEUED" && (
        <div className="alert alert-warning">
          <div className="spinner-border spinner-border-sm" role="status"></div>
          Queued
        </div>
      )}
      {successfulRequest == "RUNNING" && (
        <div className="alert alert-primary">
          <div className="spinner-border spinner-border-sm" role="status"></div>
          Running
        </div>
      )}
      {successfulRequest == "COMPLETED" && (
        <div className="alert alert-success">Completed</div>
      )}
      {successfulRequest == "FAILED" && (
        <div className="alert alert-danger">Failed</div>
      )}
      {apiError != "" && <code>{apiError}</code>}
      {studyAccession != "" && (
        <a href={`${process.env.NEXT_PUBLIC_HOST}/studies/${studyAccession}`}>
          Go to Study
        </a>
      )}
    </div>
  );
};
