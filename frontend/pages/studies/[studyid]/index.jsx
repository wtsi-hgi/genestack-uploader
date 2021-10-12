import {useRouter} from "next/router"
import { useEffect, useState } from "react";
import { apiRequest, keyCheck, postApiReqiest } from "../../../utils/api"
import styles from '../../../styles/Home.module.css'
import { HelpModal } from "../../../utils/HelpModal";

const helpText = "Using this page, you can edit the metadata for a study. Change the fields \
you want and then click submit at the bottom to update the study."

const Study = () => {
    const router = useRouter();

    const [studyId, setStudyId] = useState("");
    const [studyData, setStudyData] = useState(Object);
    const [newData, setNewData] = useState(Object);
    const [signalData, setSignalData] = useState([]);
    const [successfulRequest, setSuccessfulRequest] = useState("");
    const [apiError, setApiError] = useState("");
    const [showHelpModal, setShowHelpModal] = useState(false);

    useEffect(() => {
        var {studyid} = router.query;
        if (studyid) {
            keyCheck()
            setStudyId(studyid);
            apiRequest(`studies/${studyid}`).then((study) => {
                if (study) {
                    setStudyData({...study.data});
                    setNewData({...study.data});
                }
            });
            apiRequest(`studies/${studyid}/signals`).then((signals) => {
                if (signals) {
                    setSignalData(signals.data.signals)
                }
            })
        }
    }, [router.query])

    const submitForm = async () => {
        setSuccessfulRequest("LOADING")
        var [req_ok, req_info] = await postApiReqiest(`studies/${studyId}`, newData)
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
            <h1>{studyData["Study Title"]}</h1>

            <HelpModal header="Study" helpText={helpText} show={showHelpModal} handleClose={() => {setShowHelpModal(false)}} />
            <button type="button" className="btn btn-info btn-sm" onClick={() => {setShowHelpModal(true)}}>Help</button>
            <br />

            <div className={styles.flexContainer}>
                <div className={styles.flexColumn}>
                    <form>
                        {Object.keys(studyData).map((key) => (
                            <div key={key} className="form-group">
                                <label htmlFor={key}>{key}</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    name={key} 
                                    defaultValue={studyData[key]} 
                                    onChange={e => {setNewData({...newData, [key]: e.target.value})}} 
                                    />
                                <br />
                            </div>
                        ))}
                        <button type="button" className="btn btn-primary" onClick={submitForm}>Submit</button>
                    </form>
                    <br />
                    {successfulRequest == "LOADING" && (<div className="spinner-border" role="status"></div>)}
                    {successfulRequest == "SUCCESS" && (<div className="alert alert-success">Success</div>)}
                    {successfulRequest == "FAIL" && (<div className="alert alert-warning">Fail</div>)}
                    {apiError != "" && (<code>{apiError}</code>)}
                </div>
            
                <div className={styles.flexColumn}>
                    <h3>Signals</h3>
                    <a href={`/studies/${studyId}/signals`}>New Signal</a>
                    {signalData.map((e) => (<a key={`signal-${e.itemId}`} href={`/studies/${studyId}/signals/${e.itemId}`}>{e.itemId}</a>))}
                </div>
            </div>
        </div>
    )
}

export default Study;