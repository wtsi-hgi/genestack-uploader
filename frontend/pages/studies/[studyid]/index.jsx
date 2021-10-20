import {useRouter} from "next/router"
import { useEffect, useState } from "react";
import { apiRequest, keyCheck, postApiReqiest } from "../../../utils/api"
import styles from '../../../styles/Home.module.css'
import { HelpModal } from "../../../utils/HelpModal";
import { ArrowLeftCircle } from "react-bootstrap-icons";
import Link from "next/link"
import { viewStudyHelpText } from "../../../utils/helpText";

const Study = () => {
    const router = useRouter();

    const [studyId, setStudyId] = useState("");
    const [studyData, setStudyData] = useState(Object);
    const [signalData, setSignalData] = useState([]);
    const [showHelpModal, setShowHelpModal] = useState(false);

    useEffect(() => {
        var {studyid} = router.query;
        if (studyid) {
            keyCheck()
            setStudyId(studyid);
            apiRequest(`studies/${studyid}`).then((study) => {
                if (study) {
                    setStudyData({...study.data});
                }
            });
            apiRequest(`studies/${studyid}/signals`).then((signals) => {
                if (signals) {
                    setSignalData(signals.data.signals)
                }
            })
        }
    }, [router.query])

    return (
        <div className={styles.main}>
            <h1>{studyData["Study Source"]}</h1>

            <Link href={`${process.env.NEXT_PUBLIC_HOST}/`}><a className={styles.backButton}><ArrowLeftCircle /></a></Link>

            <HelpModal header="Study" helpText={viewStudyHelpText} show={showHelpModal} handleClose={() => {setShowHelpModal(false)}} />
            <button type="button" className="btn btn-info btn-sm" onClick={() => {setShowHelpModal(true)}}>Help</button>
            <br />

            <div className={styles.flexContainer}>
                <div className={styles.flexColumn}>
                    <table className="table table-striped table-bordered table-hover table-sm">
                        <tbody>
                            {Object.keys(studyData).map((key) => (
                                <tr key={key}>
                                    <td>{key}</td>
                                    <td>{studyData[key]}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <br />
                </div>
            
                <div className={styles.flexColumn}>
                    <h3>Signals</h3>
                    <a href={`${process.env.NEXT_PUBLIC_HOST}/studies/${studyId}/signals`}>New Signal</a>
                    {signalData.map((e) => (<a key={`signal-${e.itemId}`} href={`${process.env.NEXT_PUBLIC_HOST}/studies/${studyId}/signals/${e.itemId}`}>{e.itemId}</a>))}
                </div>
            </div>
        </div>
    )
}

export default Study;