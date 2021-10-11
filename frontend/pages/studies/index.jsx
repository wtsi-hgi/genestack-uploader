import { apiRequest, keyCheck, postApiReqiest } from "../../utils/api";
import styles from "../../styles/Home.module.css"
import {useEffect, useState} from "react"

const NewStudy = () => {
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState("");
    const [templateFields, setTemplateFields] = useState([]);
    const [newStudy, setNewStudy] = useState(Object);

    useEffect(() => {
        keyCheck()
        apiRequest("templates").then((t) => {
            setTemplates(t.data.map(e => ({"name": e.name, "accession": e.accession})))
        })
    }, [])

    const loadTemplate = () => {
        apiRequest(`templates/${selectedTemplate}`).then(t => {
            var fields = t.data.template.filter(e => !e.isReadOnly && e.dataType == "study").map(e => e.name)
            setTemplateFields(fields)
            setNewStudy(fields.reduce((xs, x) => ({...xs, [x]: ""}), {}))
        })
    }

    const submitStudy = async () => {
        // TODO Actual feedback to user, not just console logs
        var req = await postApiReqiest("studies", newStudy)
        if (req) {
            console.log("OK")
        } else {
            console.log("Not OK")
        }
    }

    return (
        <div className={styles.main}>
            <h1>New Study</h1>
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
                    <div key={e} className="form-group">
                        <label htmlFor={e}>{e}</label>
                        <input
                            type="text"
                            className="form-control"
                            name={e}
                            onChange={event => {setNewStudy({...newStudy, [e]: event.target.value})}}
                        />
                        <br />
                    </div>
                ))}
                {templateFields.length != 0 && (<button type="button" className="btn btn-primary" onClick={submitStudy}>Submit</button>)}
            </form>
        </div>
    )
}

export default NewStudy;