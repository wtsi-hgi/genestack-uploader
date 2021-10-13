import { useEffect, useState } from "react"
import { apiRequest, keyCheck, postApiReqiest } from "../../../../utils/api";
import styles from "../../../../styles/Home.module.css"
import { useRouter } from "next/router";
import { HelpModal } from "../../../../utils/HelpModal";

const helpText = "This page will help you create a new signal for the study. Firstly, select \
a template, and then a tempalte subtype, and fill out the parts of the form you want. Then click submit."

const NewSignal = () => {
    const router = useRouter();

    const [studyId, setStudyId] = useState("");
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState("");
    const [fullTemplateFields, setFullTemplateFields] = useState([]);
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
    }, [router.query])

    const loadTemplate = () => {
        apiRequest(`templates/${selectedTemplate}`).then(t => {
            setFullTemplateFields(t.data.template)
            setTemplateSubtypes([...new Set(t.data.template.map(e => e.dataType))]);
        })
    }

    const loadTemplateSubtype = () => {
        var fields = fullTemplateFields.filter(e => !e.isReadOnly && e.dataType == selectedTemplateSubtype).map(e => e.name)
        setTemplateFields(fields)
        setSelectedTemplateSubtype(fields[0])
        setNewSignal({
            "type": "expression", // first to load
            "data": "",
            "tag": "",
            "linkingattribute": [],
            "metadata": fields.reduce((xs, x) => ({...xs, [x]: ""}), {})
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
                    <br />
                    <button type="button" className="btn btn-primary"
                        onClick={loadTemplate}>Load Template</button>
                </div>
            </form>
            <br />
            <form>
                {templateSubtypes.length != 0 && <div className="form-group">
                    <label htmlFor="select-template-subtype">Select Template Subtype</label>
                    <select className="form-select" name="select-template-subtype"
                        onChange={e => {setSelectedTemplateSubtype(e.target.value)}}>
                        {templateSubtypes.map(e => (<option key={`subtype-${e}`} value={e}>{e}</option>))}
                    </select>
                    <br />
                    <button type="button" className="btn btn-primary"
                        onClick={loadTemplateSubtype}>Load Template Subtype</button>
                </div>}
            </form>
            <br />
            <form>
                {templateFields.length != 0 && (
                    <div className="form-group">
                        <label htmlFor="select-signal-type">Signal Type</label>
                        <select className="form-select" name="select-signal-type"
                            onChange={(e) => setNewSignal({...newSignal, "type": e.target.value})}>
                            <option value="expression">Expression</option>
                            <option value="variant">Variant</option>
                        </select>
                        <br />
                        <label htmlFor="signal-data">Data</label>
                        <input 
                            type="text" 
                            className="form-control"
                            name="signal-data"
                            onChange={event => {setNewSignal({
                                ...newSignal,
                                "data": event.target.value
                            })}}
                        />
                        <br />
                        <label htmlFor="signal-tag">Tag</label>
                        <input
                            type="text"
                            className="form-control"
                            name="signal-tag"
                            onChange={event => {setNewSignal({
                                ...newSignal,
                                "tag": event.target.value
                            })}}
                        />
                        <br />
                        <label htmlFor="linking-attribute">Linking attribute</label>
                        {newSignal.linkingattribute.map((val, idx) => (
                            <input
                                type="text"
                                key={`linking-${idx}`}
                                className="form-control"
                                defaultValue={val}
                                onChange={e => {
                                    var tmp_links = newSignal.linkingattribute;
                                    tmp_links[idx] = e.target.value;
                                    setNewSignal({...newSignal, "linkingattribute": tmp_links})
                                }}
                            />
                        ))}
                        <button type="button" className="btn btn-sm btn-secondary"
                            onClick={() => {setNewSignal({...newSignal, "linkingattribute": [...newSignal.linkingattribute, ""]})}}
                            >Add</button>
                    </div>
                )}
                {templateFields.map(e => (
                    <div key={e} className="form-group">
                        <label htmlFor={e}>{e}</label>
                        <input
                            type="text"
                            className="form-control"
                            name={e}
                            onChange={event => {setNewSignal({
                                ...newSignal,
                                "metadata": {
                                    ...newSignal.metadata,
                                    [e]: event.target.value
                                }
                            })}}
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