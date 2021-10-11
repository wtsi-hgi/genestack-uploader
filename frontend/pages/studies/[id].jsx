import {useRouter} from "next/router"
import { useEffect, useState } from "react";
import { apiRequest, keyCheck } from "../../utils/api"
import styles from '../../styles/Home.module.css'

const Study = () => {
    const router = useRouter();

    const [studyData, setStudyData] = useState(Object);

    useEffect(() => {
        var {id} = router.query;
        if (id) {
            keyCheck()
            apiRequest(`studies/${id}`).then((study) => {if (study) {setStudyData({...study.data})}});
        }
    }, [router.query])

    return (
        <div className={styles.main}>
            <h1>{studyData["Study Title"]}</h1>
            <form>
                {Object.keys(studyData).map((key) => (
                    <div key={key} className="form-group">
                        <label htmlFor={key}>{key}</label>
                        <input type="text" className="form-control" id={key} defaultValue={studyData[key]}></input>
                        <br />
                    </div>
                ))}
            </form>
        </div>
    )
}

export default Study;