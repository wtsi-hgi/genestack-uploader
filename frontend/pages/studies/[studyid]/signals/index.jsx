import { useEffect, useState } from "react"
import { apiRequest, keyCheck, postApiReqiest } from "../../../../utils/api";
import styles from "../../../../styles/Home.module.css"
import { useRouter } from "next/router";


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

    useEffect(() => {
        var {studyid} = router.query;

        if (studyid) {
            keyCheck()
            setStudyId(studyid)
            apiRequest("templates").then((t) => {
                setTemplates(t.data.map(e => ({"name": e.name, "accession": e.accession})))
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
        setNewSignal(fields.reduce((xs, x) => ({...xs, [x]: ""}), {}))
    }

    const submitSignal = async () => {
        var [req_ok, req_info] = await postApiReqiest(`studies/${studyId}/signals`, newSignal)
        if (req_ok) {
            setSuccessfulRequest("SUCCESS")
            setApiError("")
            setTimeout(() => {setSuccessfulRequest("")}, 5000)
        } else {
            setSuccessfulRequest("FAIL")
            setApiError(req_info)
        }
    }

    return (
        <div className={styles.main}>
            <h1>New Signal</h1>
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
                {templateFields.map(e => (
                    <div key={e} className="form-group">
                        <label htmlFor={e}>{e}</label>
                        <input
                            type="text"
                            className="form-control"
                            name={e}
                            onChange={event => {setNewSignal({...newSignal, [e]: event.target.value})}}
                        />
                        <br />
                    </div>
                ))}
                {templateFields.length != 0 && (<button type="button" className="btn btn-primary" onClick={submitSignal}>Submit</button>)}
            </form>
            <br />
            {successfulRequest == "SUCCESS" && (<div className="alert alert-success">Success</div>)}
            {successfulRequest == "FAIL" && (<div className="alert alert-warning">Fail</div>)}
            {apiError != "" && (<code>{apiError}</code>)}
        </div>
    )
}

export default NewSignal;