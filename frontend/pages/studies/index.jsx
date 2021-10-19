import { apiRequest, keyCheck, postApiReqiest } from "../../utils/api";
import styles from "../../styles/Home.module.css"
import {useEffect, useState} from "react"
import {HelpModal} from "../../utils/HelpModal"
import { ArrowLeftCircle } from "react-bootstrap-icons";
import Link from "next/link"

const helpText = "Using this page, you can create a new study. First, select the template you wish to use, and \
load it. Then, fill out the boxes you want, and click submit at the bottom."

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
        keyCheck()
        apiRequest("templates").then((t) => {
            var templates = t.data.map(e => ({"name": e.name, "accession": e.accession}))
            setTemplates(templates)
            setSelectedTemplate(templates[0].accession)
        })
    }, [])

    const loadTemplate = () => {
        apiRequest(`templates/${selectedTemplate}`).then(t => {
            var fields = t.data.template.filter(e => !e.isReadOnly && e.dataType == "study").map(e => ({"name": e.name , "required": e.isRequired}))
            fields.unshift({"name": "Sample File", "required": true})
            setTemplateFields(fields)
            setNewStudy(fields.reduce((xs, x) => ({...xs, [x.name]: ""}), {}))
        })
    }

    const submitStudy = async () => {
        setSuccessfulRequest("LOADING")
        setApiError("")
        var [req_ok, req_info] = await postApiReqiest("studies", newStudy)
        if (req_ok) {
            setSuccessfulRequest("SUCCESS")
            setTimeout(() => {setSuccessfulRequest("")}, 5000)
            setCreatedStudyAccesion(JSON.parse(req_info).data.accession)
        } else {
            setSuccessfulRequest("FAIL")
            setApiError(req_info)
        }
    }

    return (
        <div className={styles.main}>
            <h1>New Study</h1>

            <Link href={`${process.env.NEXT_PUBLIC_HOST}/`}><a className={styles.backButton}><ArrowLeftCircle /></a></Link>

            <HelpModal header="New Study" helpText={helpText} show={showHelpModal} handleClose={() => {setShowHelpModal(false)}}/>
            <button type="button" className="btn btn-info btn-sm" onClick={() => {setShowHelpModal(true)}}>Help</button>
            <br />
            
            <form>
                <div className="form-group">
                    <label htmlFor="select-template">Select a Template</label>
                    <select className="form-select" name="select-template"
                        onChange={e => {setSelectedTemplate(e.target.value)}}>
                        {templates.map(e => (<option key={e.accession} value={e.accession}>{e.name}</option>))}
                    </select>
                    <br />
                    <button type="button" className="btn btn-primary"
                    onClick={loadTemplate}>Load Template</button>
                </div>
            </form>
            <br />
            <form>
                {templateFields.map(e => (
                    <div key={e.name} className="form-group">
                        <label htmlFor={e.name}>{e.name}</label>
                        <input
                            type="text"
                            className={`form-control ${e.required && "is-invalid"}`}
                            name={e.name}
                            onChange={event => {
                                setNewStudy({...newStudy, [e.name]: event.target.value})
                                if (event.target.value != "") {
                                    event.target.classList.remove("is-invalid")
                                } else {
                                    if (e.required) {
                                        event.target.classList.add("is-invalid")
                                    }
                                }
                            }}
                        />
                        <br />
                    </div>
                ))}
                {templateFields.length != 0 && (<button type="button" className="btn btn-primary" onClick={submitStudy}>Submit</button>)}
            </form>
            <br />
            {successfulRequest == "LOADING" && (<div className="spinner-border" role="status"></div>)}
            {successfulRequest == "SUCCESS" && (<div className="alert alert-success">Success</div>)}
            {successfulRequest == "FAIL" && (<div className="alert alert-warning">Fail</div>)}
            {apiError != "" && (<code>{apiError}</code>)}
            {createdStudyAccession != "" && (<a href={`${process.env.NEXT_PUBLIC_HOST}/studies/${createdStudyAccession}`}>Go to New Study</a>)}
        </div>
    )
}

export default NewStudy;