import Head from 'next/head'
import { useEffect, useState } from 'react';
import styles from '../styles/Home.module.css'
import { apiRequest } from '../utils/api';


const studyNames = async () => {
  var studies = await apiRequest("studies", true);
  return studies.data.map(e => ({"title": e["Study Title"], "accession": e["genestack:accession"]}));
}

export default function Home() {

  const [studies, setStudies] = useState([]);
  const [selectedStudy, setSelectedStudy] = useState("");
  const [unauthorisedWarning, setUnauthorisedWarning] = useState(false);

  const authenticate = () => {
    localStorage.setItem("unauthorised", false);
    studyNames().then((names) => {setStudies(names)})
  }

  useEffect(() => {
    setUnauthorisedWarning(localStorage.getItem("unauthorised"))
    authenticate()
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
          <input type="text" name="token" className="form-control" onChange={e => localStorage.setItem("Genestack-API-Token", e.currentTarget.value)}/>
          <button className="btn btn-warning form-control" onClick={authenticate}>Authenticate</button>
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
