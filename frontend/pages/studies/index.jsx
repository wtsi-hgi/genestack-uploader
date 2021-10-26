import { apiRequest, keyCheck, postApiReqiest } from "../../utils/api";
import styles from "../../styles/Home.module.css";
import { useEffect, useState } from "react";
import { HelpModal } from "../../utils/HelpModal";
import { ArrowLeftCircle, Trash } from "react-bootstrap-icons";
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
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [createdStudyAccession, setCreatedStudyAccesion] = useState("");

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
    apiRequest(`templates/${selectedTemplate}`).then((t) => {
      var fields = t.data.template
        .filter((e) => !e.isReadOnly && e.dataType == "study")
        .map((e) => ({ name: e.name, required: e.isRequired }));
      fields.unshift({ name: "Sample File", required: true });
      setNewStudy(
        fields.reduce((xs, x) => ({ ...xs, [x.name]: "" }), {
          renamedColumns: [],
        })
      );
      setTemplateFields(fields);
    });
  };

  const submitStudy = async () => {
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
