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

import { useEffect, useState } from "react"
import { apiRequest } from "./api";

export const JobStatus = ({ jobID }) => {

    const [successfulRequest, setSuccessfulRequest] = useState("");
    const [apiError, setApiError] = useState("");
    const [createdStudyAccession, setCreatedStudyAccession] = useState("");

    const updateJobState = (jobID, refreshID) => {
        apiRequest(`jobs/${jobID}`).then((t) => {
          setSuccessfulRequest(t.status);
    
          if (t.status === "FAILED") {
            setApiError(JSON.stringify(t.output));
            clearInterval(refreshID);
          } else if (t.status === "COMPLETED") {
            setCreatedStudyAccession(t.output.accession);
            clearInterval(refreshID);
          }
        })
      }

    useEffect(() => {
        updateJobState(jobID, null)
        let refreshID = setInterval(() => {
        updateJobState(jobID, refreshID)
        }, 20000)
    }, [])

    return (
        <div>
            {
                successfulRequest == "QUEUED" && (
                    <div className="alert alert-warning">
                        <div className="spinner-border spinner-border-sm" role="status">
                        </div>
                        Queued
                    </div>
                )
            }
            {
                successfulRequest == "RUNNING" && (
                    <div className="alert alert-primary">
                        <div className="spinner-border spinner-border-sm" role="status">
                        </div>
                        Running
                    </div>
                )
            }
            {successfulRequest == "COMPLETED" && (
                <div className="alert alert-success">Completed</div>
            )}
            {successfulRequest == "FAILED" && (
                <div className="alert alert-danger">Failed</div>
            )}
            {apiError != "" && <code>{apiError}</code>}
            {createdStudyAccession != "" && (
                <a
                    href={`${process.env.NEXT_PUBLIC_HOST}/studies/${createdStudyAccession}`}
                >
                    Go to New Study
                </a>
            )}
        </div>
    )
}