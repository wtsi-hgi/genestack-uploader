import { useEffect, useState } from "react"
import { apiRequest, keyCheck, postApiReqiest } from "../../../../utils/api";
import styles from "../../../../styles/Home.module.css"
import { useRouter } from "next/router";
import { HelpModal } from "../../../../utils/HelpModal";
import { Trash, ArrowLeftCircle } from "react-bootstrap-icons";
import Link from "next/link"

const helpText = "This page will help you create a new signal for the study. Firstly, select \
a template, and then a tempalte subtype, and fill out the parts of the form you want. Then click submit."

const NewSignal = () => {
    const router = useRouter();

    const [studyId, setStudyId] = useState("");
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState("");
    const [templateSubtypes, setTemplateSubtypes] = useState([]);
    const [selectedTemplateSubtype, setSelectedTemplateSubtype] = useState("");
    const [templateFields, setTemplateFields] = useState([]);
    const [newSignal, setNewSignal] = useState(Object);
    const [successfulRequest, setSuccessfulRequest] = useState("");
    const [apiError, setApiError] = useState("");
    const [showHelpModal, setShowHelpModal] = useState(false); 

    useEffect(() => {
        var {studyid} = router.query;

        if (studyid) {
            keyCheck()
            setStudyId(studyid)
            apiRequest("templates").then((t) => {
                var templates = t.data.map(e => ({"name": e.name, "accession": e.accession}))
                setTemplates(templates);
                setSelectedTemplate(templates[0].accession);
            })
        }

        apiRequest("templateTypes").then((t) => {
            setTemplateSubtypes(t.data.map(e => ({"name": e.displayName, "type": e.dataType})))
        })
    }, [router.query])

    const loadTemplate = () => {
        apiRequest(`templates/${selectedTemplate}`).then(t => {
            var fields = t.data.template.filter(e => !e.isReadOnly && e.dataType == selectedTemplateSubtype).map(e => ({"name": e.name, "required": e.isRequired}))
            setNewSignal({
                "type": selectedTemplateSubtype, // first to load
                "data": "",
                "tag": "",
                "linkingattribute": ["Sample Source ID"],
                "metadata": fields.reduce((xs, x) => ({...xs, [x.name]: ""}), {})
            })
            setTemplateFields(fields)
        })
    }

    const submitSignal = async () => {
        setSuccessfulRequest("LOADING")
        setApiError("")
        var [req_ok, req_info] = await postApiReqiest(`studies/${studyId}/signals`, newSignal)
        if (req_ok) {
            setSuccessfulRequest("SUCCESS")
            setTimeout(() => {setSuccessfulRequest("")}, 5000)
        } else {
            setSuccessfulRequest("FAIL")
            setApiError(req_info)
        }
    }

    return (
        <div className={styles.main}>
            <h1>New Signal</h1>

            <Link href={`${process.env.NEXT_PUBLIC_HOST}/studies/${studyId}`}><a className={styles.backButton}><ArrowLeftCircle /></a></Link>

            <HelpModal header="New Signal" helpText={helpText} show={showHelpModal} handleClose={() => {setShowHelpModal(false)}} />
            <button type="button" className="btn btn-info btn-sm" onClick={() => {setShowHelpModal(true)}}>Help</button>
            <br />

            <form>
                <div className="form-group">
                    <label htmlFor="select-template">Select a Template</label>
                    <select className="form-select" name="select-template"
                        onChange={e => {setSelectedTemplate(e.target.value)}}>
                        {templates.map(e => (<option key={e.accession} value={e.accession}>{e.name}</option>))}
                    </select>
                </div>
            </form>
            <br />
            <form>
                <div className="form-group">
                    <label htmlFor="select-template-subtype">Select Type</label>
                    <select className="form-select" name="select-template-subtype"
                        onChange={e => {setSelectedTemplateSubtype(e.target.value)}}>
                        {templateSubtypes.map(e => (<option key={`subtype-${e.name}`} value={e.type}>{e.name}</option>))}
                    </select>
                    <br />
                    <button type="button" className="btn btn-primary"
                        onClick={loadTemplate}>Load Template</button>
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
                            onChange={event => {setNewSignal({
                                    ...newSignal,
                                    "data": event.target.value
                                })
                                if (event.target.value != "") {
                                    event.target.classList.remove("is-invalid")
                                } else {
                                    event.target.classList.add("is-invalid")
                                }
                        }}
                        />
                        <br />
                        <label htmlFor="signal-tag">Tag</label>
                        <input
                            type="text"
                            className="form-control is-invalid"
                            name="signal-tag"
                            onChange={event => {setNewSignal({
                                    ...newSignal,
                                    "tag": event.target.value
                                })
                                if (event.target.value != "") {
                                    event.target.classList.remove("is-invalid")
                                } else {
                                    event.target.classList.add("is-invalid")
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
                                onBlur={e => {
                                    var tmp_links = newSignal.linkingattribute;
                                    tmp_links[idx] = e.target.value;
                                    setNewSignal({...newSignal, "linkingattribute": tmp_links})
                                }}
                            />
                            <button
                                type="button"
                                className="btn btn-sm btn-danger"
                                onClick={() => {
                                    var tmp = newSignal.linkingattribute;
                                    tmp.splice(idx, 1)
                                    setNewSignal({...newSignal, "linkingattribute": tmp})
                                }}
                            ><Trash /></button>
                            </div>
                        ))}
                        <button type="button" className="btn btn-sm btn-secondary"
                            onClick={() => {setNewSignal({...newSignal, "linkingattribute": [...newSignal.linkingattribute, ""]})}}
                            >Add</button>
                        <br />
                    </div>
                )}
                {templateFields.map(e => (
                    <div key={e.name} className="form-group">
                        <label htmlFor={e.name}>{e.name}</label>
                        <input
                            type="text"
                            className={`form-control ${e.required && "is-invalid"}`}
                            name={e.name}
                            onChange={event => {setNewSignal({
                                    ...newSignal,
                                    "metadata": {
                                        ...newSignal.metadata,
                                        [e.name]: event.target.value
                                    }
                                })
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
                {templateFields.length != 0 && (<button type="button" className="btn btn-primary" onClick={submitSignal}>Submit</button>)}
            </form>
            <br />
            {successfulRequest == "LOADING" && (<div className="spinner-border" role="status"></div>)}
            {successfulRequest == "SUCCESS" && (<div className="alert alert-success">Success</div>)}
            {successfulRequest == "FAIL" && (<div className="alert alert-warning">Fail</div>)}
            {apiError != "" && (<code>{apiError}</code>)}
        </div>
    )
}

export default NewSignal;