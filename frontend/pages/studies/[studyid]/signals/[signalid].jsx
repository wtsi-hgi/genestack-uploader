import { useRouter } from "next/router"
import { useEffect, useState } from "react";
import { apiRequest, keyCheck } from "../../../../utils/api";
import styles from '../../../../styles/Home.module.css'

const Signal = () => {
    const router = useRouter();
    
    const [studyId, setStudyId] = useState("");
    const [signalId, setSignalId] = useState("");
    const [signalData, setSignalData] = useState(Object);
    const [newData, setNewData] = useState(Object);

    useEffect(() => {
        var {studyid, signalid} = router.query;
        if (studyid && signalid) {
            keyCheck();
            setStudyId(studyid);
            setSignalId(signalid);
            apiRequest(`studies/${studyid}/signals/${signalid}`).then((signal) => {
                if (signal) {
                    setSignalData({...signal.data});
                    setNewData({...signal.data});
                }
            })
        }
    }, [router.query])

    return (
        <div className={styles.main}>
            <p>{JSON.stringify(signalData)}</p>
        </div>
    )
}

export default Signal;