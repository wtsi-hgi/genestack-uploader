import {useRouter} from "next/router"
import { useEffect, useState } from "react";
import { apiRequest, keyCheck, postApiReqiest } from "../../utils/api"
import styles from '../../styles/Home.module.css'

const Study = () => {
    const router = useRouter();

    const [studyId, setStudyId] = useState("");
    const [studyData, setStudyData] = useState(Object);
    const [newData, setNewData] = useState(Object);

    useEffect(() => {
        var {id} = router.query;
        if (id) {
            keyCheck()
            setStudyId(id);
            apiRequest(`studies/${id}`).then((study) => {
                if (study) {
                    setStudyData({...study.data});
                    setNewData({...study.data});
                }
            });
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
            <form>
                {Object.keys(studyData).map((key) => (
                    <div key={key} className="form-group">
                        <label htmlFor={key}>{key}</label>
                        <input 
                            type="text" 
                            className="form-control" 
                            id={key} 
                            defaultValue={studyData[key]} 
                            onChange={e => {setNewData({...newData, [key]: e.target.value})}} 
                            />
                        <br />
                    </div>
                ))}
                <button type="button" className="btn btn-primary" onClick={submitForm}>Submit</button>
            </form>
        </div>
    )
}

export default Study;