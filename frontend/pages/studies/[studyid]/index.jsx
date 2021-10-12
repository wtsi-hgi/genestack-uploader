import {useRouter} from "next/router"
import { useEffect, useState } from "react";
import { apiRequest, keyCheck, postApiReqiest } from "../../../utils/api"
import styles from '../../../styles/Home.module.css'

const Study = () => {
    const router = useRouter();

    const [studyId, setStudyId] = useState("");
    const [studyData, setStudyData] = useState(Object);
    const [newData, setNewData] = useState(Object);
    const [signalData, setSignalData] = useState([]);

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
        // TODO Actual feedback to user, not just console logs
        var req = await postApiReqiest(`studies/${studyId}`, newData)
        if (req) {
            console.log("OK")
        } else {
            console.log("Not OK")
        }
    }

    return (
        <div className={styles.main}>
            <h1>{studyData["Study Title"]}</h1>
            <div className={styles.flexContainer}>
                <form className={styles.flexColumn}>
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