/**
Genestack Uploader
A HTTP server providing an API and a frontend for easy uploading to Genestack

Copyright (C) 2021 Genome Research Limited

Author: Michael Grace <mg38@sanger.ac.uk>

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { apiRequest, keyCheck, postApiReqiest } from "../../../utils/api";
import styles from "../../../styles/Home.module.css";
import { HelpModal } from "../../../utils/HelpModal";
import { ArrowLeftCircle } from "react-bootstrap-icons";
import Link from "next/link";
import { viewStudyHelpText } from "../../../utils/helpText";
import Head from "next/head";

const Study = () => {
  const router = useRouter();

  const [studyId, setStudyId] = useState("");
  const [studyData, setStudyData] = useState(Object);
  const [signalData, setSignalData] = useState([]);
  const [showHelpModal, setShowHelpModal] = useState(false);

  useEffect(() => {
    var { studyid } = router.query;
    if (studyid) {
      keyCheck();
      setStudyId(studyid);
      apiRequest(`studies/${studyid}`).then((study) => {
        if (study) {
          setStudyData({ ...study.data });
        }
      });
      apiRequest(`studies/${studyid}/signals`).then((signals) => {
        if (signals) {
          setSignalData(signals.data.signals);
        }
      });
    }
  }, [router.query]);

  return (
    <div className={styles.main}>
      <Head>
        <title>{studyData["Study Source"]} | Genestack Uploader</title>
      </Head>
      <h1>{studyData["Study Source"]}</h1>

      <Link href={`${process.env.NEXT_PUBLIC_HOST}/`}>
        <a className={styles.backButton}>
          <ArrowLeftCircle />
        </a>
      </Link>

      <HelpModal
        header="Study"
        helpText={viewStudyHelpText}
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
          <a
            href={`${process.env.NEXT_PUBLIC_HOST}/studies/${studyId}/signals`}
          >
            New Signal
          </a>
          {signalData.map((e) => (
            <a
              key={`signal-${e.itemId}`}
              href={`${process.env.NEXT_PUBLIC_HOST}/studies/${studyId}/signals/${e.itemId}`}
            >
              {e.itemId}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Study;
