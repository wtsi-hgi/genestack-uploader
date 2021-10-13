import Head from 'next/head'
import { useEffect, useState } from 'react';
import styles from '../styles/Home.module.css'
import { apiRequest } from '../utils/api';


const studyNames = async (ignore_unauth) => {
  var studies = await apiRequest("studies", ignore_unauth);
  return studies.data.map(e => ({"title": e["Study Source"], "accession": e["genestack:accession"]}));
}

const saveAPIToken = (token) => {
  localStorage.setItem("Genestack-API-Token", token);
  localStorage.setItem("Genestack-API-Set-Time", Date.now());
}

export default function Home() {

  const [studies, setStudies] = useState([]);
  const [selectedStudy, setSelectedStudy] = useState("");
  const [unauthorisedWarning, setUnauthorisedWarning] = useState(false);

  const authenticate = (ignore_unauth) => {
    localStorage.setItem("unauthorised", false);
    !ignore_unauth && setUnauthorisedWarning(false);
    studyNames(ignore_unauth).then((names) => {setStudies(names)})
  }

  useEffect(() => {
    setUnauthorisedWarning(localStorage.getItem("unauthorised"))
    setStudies([])
    authenticate(true)
  }, [])

  const goToStudy = () => {
    window.location = `/studies/${selectedStudy}`
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Genestack Uploader</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>
          Genestack Uploader
        </h1>

        <p className={styles.description}>
          Easily upload new studies to Genestack
        </p>

        {unauthorisedWarning && <div className="alert alert-danger">
          Unauthorised
        </div>}

        <div className="form-group">
          <label>Genestack API Token</label>
          <input type="text" name="token" className="form-control" onChange={e => {saveAPIToken(e.currentTarget.value)}}/>
          <button className="btn btn-warning form-control" onClick={() => {authenticate(false)}}>Authenticate</button>
        </div>
        <br />
        <div className="form-group">
          <label>Select a Study:</label>
          <select name="study" className="form-select" onChange={(e) => {setSelectedStudy(e.target.value)}}>
            <option value="">New Study</option>
            {studies.map((e) => (<option key={e.accession} value={e.accession}>{e.title}</option>))}
          </select>
        </div>
        <br />
        <div className="form-group">
          <button className="btn btn-primary" onClick={goToStudy}>Submit</button>
        </div>

      </main>

      <footer className={styles.footer}>
        <small>Contact HGI for help.</small>
      </footer>
    </div>
  )
}
