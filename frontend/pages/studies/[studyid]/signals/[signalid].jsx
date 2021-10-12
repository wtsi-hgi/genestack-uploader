import { useRouter } from "next/router"
import { useEffect, useState } from "react";
import { apiRequest, keyCheck, postApiReqiest } from "../../../../utils/api";
import styles from '../../../../styles/Home.module.css'

const Signal = () => {
    const router = useRouter();
    
    const [studyId, setStudyId] = useState("");
    const [signalId, setSignalId] = useState("");
    const [signalData, setSignalData] = useState(Object);
    const [newData, setNewData] = useState(Object);
    const [successfulRequest, setSuccessfulRequest] = useState("");
    const [apiError, setApiError] = useState("");

    useEffect(() => {
        var {studyid, signalid} = router.query;
        if (studyid && signalid) {
            keyCheck();
            setStudyId(studyid);
            setSignalId(signalid);
            apiRequest(`studies/${studyid}/signals/${signalid}`).then((signal) => {
                if (signal) {
                    setSignalData({...signal.data.signal.metadata});
                    setNewData({...signal.data});
                }
            })
        }
    }, [router.query])

    const submitForm = async () => {
        var [req_ok, req_info] = await postApiReqiest(`studies/${studyId}/signals/${signalId}`, newData)
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
            <h1>{signalId}</h1>
            <form>
                {Object.keys(signalData).map((key) => (
                    <div key={key} className="form-group">
                        <label htmlFor={key}>{key}</label>
                        <input
                            type="text"
                            className="form-control"
                            name={key}
                            defaultValue={signalData[key]}
                            onChange={e => {setNewData({...newData, [key]: e.target.value})}}
                        />
                        <br />
                    </div>
                ))}
                <button type="button" className="btn btn-primary" onClick={submitForm}>Submit</button>
            </form>
            <br />
            {successfulRequest == "SUCCESS" && (<div className="alert alert-success">Success</div>)}
            {successfulRequest == "FAIL" && (<div className="alert alert-warning">Fail</div>)}
            {apiError != "" && (<code>{apiError}</code>)}
        </div>
    )
}

export default Signal;