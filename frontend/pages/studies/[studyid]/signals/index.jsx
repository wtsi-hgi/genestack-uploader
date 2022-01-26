/**
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
*/

import { useEffect, useState } from "react";
import { apiRequest, keyCheck, postApiReqiest } from "../../../../utils/api";
import styles from "../../../../styles/Home.module.css";
import { useRouter } from "next/router";
import { HelpModal } from "../../../../utils/HelpModal";
import { Trash, ArrowLeftCircle } from "react-bootstrap-icons";
import Link from "next/link";
import { signalsIndexHelpText } from "../../../../utils/helpText";
import Head from "next/head";
import { JobStatus } from "../../../../utils/JobStatus";

const NewSignal = () => {
  const router = useRouter();

  const [studyId, setStudyId] = useState("");

  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");

  const [templateSubtypes, setTemplateSubtypes] = useState([]);
  const [selectedTemplateSubtype, setSelectedTemplateSubtype] = useState("");

  const [templateFields, setTemplateFields] = useState([]);

  const [newSignal, setNewSignal] = useState(Object);

  const [jobID, setJobID] = useState("");

  const [showHelpModal, setShowHelpModal] = useState(false);

  useEffect(() => {
    var { studyid } = router.query;

    if (studyid) {
      keyCheck();
      setStudyId(studyid);
      apiRequest("templates").then((t) => {
        var templates = t.data.map((e) => ({
          name: e.name,
          accession: e.accession,
        }));
        setTemplates(templates);
        setSelectedTemplate(templates[0].accession);
      });

      apiRequest("templateTypes").then((t) => {
        let templateSubtypes = t.data
          .filter((e) =>
            ["expression", "variant"].includes(e.displayName.toLowerCase())
          )
          .map((e) => ({ name: e.displayName, type: e.dataType }));
        setTemplateSubtypes(templateSubtypes);
        setSelectedTemplateSubtype(JSON.stringify(templateSubtypes[0]));
      });
    }
  }, [router.query]);

  const loadTemplate = () => {
    apiRequest(`templates/${selectedTemplate}`).then((t) => {
      var fields = t.data.template
        .filter(
          (e) =>
            !e.isReadOnly &&
            e.dataType == JSON.parse(selectedTemplateSubtype).type
        )
        .map((e) => ({ name: e.name, required: e.isRequired }));
      setNewSignal({
        type: JSON.parse(selectedTemplateSubtype).name.toLowerCase(),
        data: "",
        tag: "",
        linkingattribute: ["Sample Source ID"],
        metadata: fields.reduce((xs, x) => ({ ...xs, [x.name]: "" }), {}),
        generateMinimalVCF: false,
      });
      setTemplateFields(fields);
    });
  };

  const submitSignal = async () => {
    let requiredFields = ["data", "tag"];
    let fieldsMissing = false;
    requiredFields.forEach((e) => {
      if (newSignal[e] == "") {
        fieldsMissing = true;
      }
    });

    if (fieldsMissing) {
      window.alert("Required Fields Missing");
      return;
    }

    var [req_ok, req_info] = await postApiReqiest(
      `studies/${studyId}/signals`,
      newSignal
    );
    let jobID = JSON.parse(req_info).jobId;
    setJobID(jobID);
  };

  return (
    <div className={styles.main}>
      <Head>
        <title>New Signal | Genestack Uploader</title>
      </Head>
      <h1>New Signal</h1>

      <Link href={`${process.env.NEXT_PUBLIC_HOST}/studies/${studyId}`}>
        <a className={styles.backButton}>
          <ArrowLeftCircle />
        </a>
      </Link>

      <HelpModal
        header="New Signal"
        helpText={signalsIndexHelpText}
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
        </div>
      </form>
      <br />
      <form>
        <div className="form-group">
          <label htmlFor="select-template-subtype">Select Type</label>
          <select
            className="form-select"
            name="select-template-subtype"
            onChange={(e) => {
              setSelectedTemplateSubtype(e.target.value);
            }}
          >
            {templateSubtypes.map((e) => (
              <option key={`subtype-${e.name}`} value={JSON.stringify(e)}>
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
        {templateFields.length != 0 && (
          <div className="form-group">
            <label htmlFor="signal-data">Data</label>
            <input
              type="text"
              className="form-control is-invalid"
              name="signal-data"
              onChange={(event) => {
                setNewSignal({
                  ...newSignal,
                  data: event.target.value,
                });
                if (event.target.value != "") {
                  event.target.classList.remove("is-invalid");
                } else {
                  event.target.classList.add("is-invalid");
                }
              }}
            />
            <br />
            <label htmlFor="signal-tag">Tag</label>
            <input
              type="text"
              className="form-control is-invalid"
              name="signal-tag"
              onChange={(event) => {
                setNewSignal({
                  ...newSignal,
                  tag: event.target.value,
                });
                if (event.target.value != "") {
                  event.target.classList.remove("is-invalid");
                } else {
                  event.target.classList.add("is-invalid");
                }
              }}
            />
            <br />
            <label htmlFor="linking-attribute">Linking Attributes</label>
            {newSignal.linkingattribute.map((val, idx) => (
              <div className="form-control" key={`linking-${idx}-${val}`}>
                <input
                  type="text"
                  defaultValue={val}
                  onBlur={(e) => {
                    var tmp_links = newSignal.linkingattribute;
                    tmp_links[idx] = e.target.value;
                    setNewSignal({ ...newSignal, linkingattribute: tmp_links });
                  }}
                />
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  onClick={() => {
                    var tmp = newSignal.linkingattribute;
                    tmp.splice(idx, 1);
                    setNewSignal({ ...newSignal, linkingattribute: tmp });
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
                setNewSignal({
                  ...newSignal,
                  linkingattribute: [...newSignal.linkingattribute, ""],
                });
              }}
            >
              Add
            </button>
            <br />
          </div>
        )}
        {templateFields.map((e) => (
          <div key={e.name} className="form-group">
            <label htmlFor={e.name}>{e.name}</label>
            <input
              type="text"
              className={`form-control ${e.required && "is-invalid"}`}
              name={e.name}
              onChange={(event) => {
                setNewSignal({
                  ...newSignal,
                  metadata: {
                    ...newSignal.metadata,
                    [e.name]: event.target.value,
                  },
                });
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
            {JSON.parse(selectedTemplateSubtype).name.toLowerCase() ==
              "variant" && (
              <div className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  onClick={(e) =>
                    setNewSignal({
                      ...newSignal,
                      generateMinimalVCF: e.target.checked,
                    })
                  }
                ></input>
                <label className="form-check-lable">
                  Generate Minimal VCF File
                </label>
              </div>
            )}
            <br />
            <button
              type="button"
              className="btn btn-primary"
              onClick={submitSignal}
            >
              Submit
            </button>
          </div>
        )}
      </form>
      <br />
      {jobID && <JobStatus jobID={jobID} />}
    </div>
  );
};

export default NewSignal;
