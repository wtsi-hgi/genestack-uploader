import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { apiRequest, keyCheck, postApiReqiest } from "../../../../utils/api";
import styles from "../../../../styles/Home.module.css";
import { HelpModal } from "../../../../utils/HelpModal";
import { ArrowLeftCircle } from "react-bootstrap-icons";
import Link from "next/link";
import { viewSignalHelpText } from "../../../../utils/helpText";
import Head from "next/head";

const Signal = () => {
  const router = useRouter();

  const [studyId, setStudyId] = useState("");
  const [signalId, setSignalId] = useState("");
  const [signalData, setSignalData] = useState(Object);
  const [showHelpModal, setShowHelpModal] = useState(false);

  useEffect(() => {
    var { studyid, signalid } = router.query;
    if (studyid && signalid) {
      keyCheck();
      setStudyId(studyid);
      setSignalId(signalid);
      apiRequest(`studies/${studyid}/signals/${signalid}`).then((signal) => {
        if (signal) {
          setSignalData({ ...signal.data.signal.metadata });
        }
      });
    }
  }, [router.query]);

  return (
    <div className={styles.main}>
      <Head>
        <title>{signalId} | Genestack Uploader</title>
      </Head>
      <h1>{signalId}</h1>

      <Link href={`${process.env.NEXT_PUBLIC_HOST}/studies/${studyId}`}>
        <a className={styles.backButton}>
          <ArrowLeftCircle />
        </a>
      </Link>

      <HelpModal
        header="Signal"
        helpText={viewSignalHelpText}
        show={showHelpModal}
        handleClose={() => {
          setShowHelpModal(false);
        }}
      />
      <button
        type="button"
        className="btn btn-info btn-sm"
        onClick={() => {
          setShowHelpModal(true);
        }}
      >
        Help
      </button>
      <br />

      <div className={styles.flexContainer}>
        <table className="table table-striped table-bordered table-hover table-sm">
          <tbody>
            {Object.keys(signalData).map((key) => (
              <tr key={key}>
                <td>{key}</td>
                <td>{signalData[key]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Signal;
