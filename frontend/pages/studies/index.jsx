/**
Genestack Uploader
A HTTP server providing an API and a frontend for easy uploading to Genestack

Copyright (C) 2021 Genome Research Limited

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

import { apiRequest, keyCheck, postApiReqiest } from "../../utils/api";
import styles from "../../styles/Home.module.css";
import { useEffect, useState } from "react";
import { HelpModal } from "../../utils/HelpModal";
import { ArrowLeftCircle, Trash, QuestionCircle } from "react-bootstrap-icons";
import Link from "next/link";
import { studiesIndexHelpText } from "../../utils/helpText";
import Head from "next/head";

const NewStudy = () => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [templateFields, setTemplateFields] = useState([]);

  const [newStudy, setNewStudy] = useState(Object);

  const [successfulRequest, setSuccessfulRequest] = useState("");
  const [apiError, setApiError] = useState("");
  const [createdStudyAccession, setCreatedStudyAccesion] = useState("");

  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showColNamesModal, setShowColNamesModal] = useState(false);

  useEffect(() => {
    keyCheck();
    apiRequest("templates").then((t) => {
      var templates = t.data.map((e) => ({
        name: e.name,
        accession: e.accession,
      }));
      setTemplates(templates);
      setSelectedTemplate(templates[0].accession);
    });
  }, []);

  const loadTemplate = () => {
    /**
     * When the user selects a template from the list,
     * We need to request that tempalte from the API, filter
     * it to only the fields related to a study, and the ones that
     * aren't read only. Then, we'll create {name, required} objects
     * with that, and also add the "Sample Field" entry to the list.
     *
     * Sample Field isn't part of the template, its just required
     * information regardless of the template.
     *
     * Then, we'll set the "newStudy" to all of these field names
     * mapped to a blank string. In addition to that, there's an
     * empty list for the columns we're going to rename.
     */
    apiRequest(`templates/${selectedTemplate}`).then((t) => {
      var fields = t.data.template
        .filter((e) => !e.isReadOnly && e.dataType == "study")
        .map((e) => ({ name: e.name, required: e.isRequired }));
      fields.unshift({ name: "Sample File", required: false });
      setNewStudy(
        fields.reduce((xs, x) => ({ ...xs, [x.name]: "" }), {
          addedColumns: [],
          renamedColumns: [],
          deletedColumns: [],
        })
      );
      setTemplateFields(fields);
    });
  };

  const submitStudy = async () => {
    // Check for required fields
    let requiredFields = templateFields.filter((e) => e.required);
    let fieldsMissing = false;
    requiredFields.forEach((e) => {
      if (newStudy[e.name] == "") {
        fieldsMissing = true;
      }
    });

    if (fieldsMissing) {
      setApiError("Required Fields Missing");
      return;
    }

    // POST the request, and show LOADING
    // if it succeeds, show success and the new study accession
    // if it fails, show the error
    setSuccessfulRequest("LOADING");
    setApiError("");
    var [req_ok, req_info] = await postApiReqiest("studies", newStudy);
    if (req_ok) {
      setSuccessfulRequest("SUCCESS");
      setTimeout(() => {
        setSuccessfulRequest("");
      }, 5000);
      setCreatedStudyAccesion(JSON.parse(req_info).data.accession);
    } else {
      setSuccessfulRequest("FAIL");
      setApiError(req_info);
    }
  };

  return (
    <div className={styles.main}>
      <Head>
        <title>New Study | Genestack Uploader</title>
      </Head>
      <h1>New Study</h1>

      <Link href={`${process.env.NEXT_PUBLIC_HOST}/`}>
        <a className={styles.backButton}>
          <ArrowLeftCircle />
        </a>
      </Link>

      <HelpModal
        header="New Study"
        helpText={studiesIndexHelpText}
        show={showHelpModal}
        handleClose={() => {
          setShowHelpModal(false);
        }}
      />
      <button
        type="button"
        className="btn btn-info btn-sm"
        onClick={() => {
          setShowHelpModal(true);
        }}
      >
        Help
      </button>
      <br />

      <HelpModal
        header="Sample File Column Names"
        helpText="It is required that you have the column `Sample Source ID` with
        unique values and no blanks, and the column `Sample Source` in
        your sample file."
        show={showColNamesModal}
        handleClose={() => {
          setShowColNamesModal(false);
        }}
      />

      <form>
        <div className="form-group">
          <label htmlFor="select-template">Select a Template</label>
          <select
            className="form-select"
            name="select-template"
            onChange={(e) => {
              setSelectedTemplate(e.target.value);
            }}
          >
            {templates.map((e) => (
              <option key={e.accession} value={e.accession}>
                {e.name}
              </option>
            ))}
          </select>
          <br />
          <button
            type="button"
            className="btn btn-primary"
            onClick={loadTemplate}
          >
            Load Template
          </button>
        </div>
      </form>
      <br />
      <form>
        {templateFields.map((e) => (
          <div key={e.name} className="form-group">
            <label htmlFor={e.name}>{e.name}</label>
            <input
              type="text"
              className={`form-control ${e.required && "is-invalid"}`}
              name={e.name}
              onChange={(event) => {
                setNewStudy({ ...newStudy, [e.name]: event.target.value });
                if (event.target.value != "") {
                  event.target.classList.remove("is-invalid");
                } else {
                  if (e.required) {
                    event.target.classList.add("is-invalid");
                  }
                }
              }}
            />
            <br />
          </div>
        ))}
        {templateFields.length != 0 && (
          <div>
            <h5 className="d-inline">Sample File Column Names</h5>
            <QuestionCircle
              className="mb-2"
              role="button"
              onClick={() => {
                setShowColNamesModal(true);
              }}
            />
            <br />
            <label>Add Columns</label>
            <br />
            {newStudy.addedColumns.map((val, idx) => (
              <div className="form-control" key={`adding-${idx}-${val.title}`}>
                <input
                  type="text"
                  defaultValue={val.title}
                  placeholder="Title"
                  onBlur={(e) => {
                    let tmp_added = newStudy.addedColumns;
                    tmp_added[idx].title = e.target.value;
                    setNewStudy({ ...newStudy, addedColumns: tmp_added });
                  }}
                />
                <input
                  type="text"
                  defaultValue={val.value}
                  placeholder="Value"
                  onBlur={(e) => {
                    let tmp_added = newStudy.addedColumns;
                    tmp_added[idx].value = e.target.value;
                    setNewStudy({ ...newStudy, addedColumns: tmp_added });
                  }}
                />
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  onClick={() => {
                    let tmp = newStudy.addedColumns;
                    tmp.splice(idx, 1);
                    setNewStudy({ ...newStudy, addedColumns: tmp });
                  }}
                >
                  <Trash />
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => {
                setNewStudy({
                  ...newStudy,
                  addedColumns: [
                    ...newStudy.addedColumns,
                    { title: "", value: "" },
                  ],
                });
              }}
            >
              Add
            </button>
            <br />

            <label>Rename Columns</label>
            <br />
            {newStudy.renamedColumns.map((val, idx) => (
              <div
                className="form-control"
                key={`renaming-${idx}-${val.old}-${val.new}`}
              >
                <input
                  type="text"
                  defaultValue={val.old}
                  placeholder="Old"
                  onBlur={(e) => {
                    var tmp_renames = newStudy.renamedColumns;
                    tmp_renames[idx].old = e.target.value;
                    setNewStudy({ ...newStudy, renamedColumns: tmp_renames });
                  }}
                />
                <input
                  type="text"
                  defaultValue={val.new}
                  placeholder="New"
                  onBlur={(e) => {
                    var tmp_renames = newStudy.renamedColumns;
                    tmp_renames[idx].new = e.target.value;
                    setNewStudy({ ...newStudy, renamedColumns: tmp_renames });
                  }}
                />
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  onClick={() => {
                    var tmp = newStudy.renamedColumns;
                    tmp.splice(idx, 1);
                    setNewStudy({ ...newStudy, renamedColumns: tmp });
                  }}
                >
                  <Trash />
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => {
                setNewStudy({
                  ...newStudy,
                  renamedColumns: [
                    ...newStudy.renamedColumns,
                    { old: "", new: "" },
                  ],
                });
              }}
            >
              Add
            </button>
            <br />

            <label>Delete Columns</label>
            <br />
            {newStudy.deletedColumns.map((val, idx) => (
              <div className="form-control" key={`deleting-${idx}-${val}`}>
                <input
                  type="text"
                  defaultValue={val}
                  placeholder="Column Title"
                  onBlur={(e) => {
                    let tmp_deletes = newStudy.deletedColumns;
                    tmp_deletes[idx] = e.target.value;
                    setNewStudy({ ...newStudy, deletedColumns: tmp_deletes });
                  }}
                />
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  onClick={() => {
                    let tmp = newStudy.deletedColumns;
                    tmp.splice(idx, 1);
                    setNewStudy({ ...newStudy, deletedColumns: tmp });
                  }}
                >
                  <Trash />
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => {
                setNewStudy({
                  ...newStudy,
                  deletedColumns: [...newStudy.deletedColumns, ""],
                });
              }}
            >
              Add
            </button>
            <br />

            <br />
            <button
              type="button"
              className="btn btn-primary"
              onClick={submitStudy}
            >
              Submit
            </button>
          </div>
        )}
      </form>
      <br />
      {successfulRequest == "LOADING" && (
        <div className="spinner-border" role="status"></div>
      )}
      {successfulRequest == "SUCCESS" && (
        <div className="alert alert-success">Success</div>
      )}
      {successfulRequest == "FAIL" && (
        <div className="alert alert-warning">Fail</div>
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
  );
};

export default NewStudy;
