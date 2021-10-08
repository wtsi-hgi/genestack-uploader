import Head from 'next/head'
import { useState } from 'react';
import styles from '../styles/Home.module.css'
import { apiRequest } from '../utils/api';


const studyNames = async () => {
  var studies = await apiRequest("studies");
  return studies.data.map(e => e["Study Title"]);
}

export default function Home() {

  const [apiKey, setApiKey] = useState("");
  const [studies, setStudies] = useState([]);

  const authenticate = () => {
    localStorage.setItem("Genestack-API-Token", apiKey)
    studyNames().then((names) => {setStudies(names)})
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Create Next App</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>
          Genestack Uploader
        </h1>

        <p className={styles.description}>
          Easily upload new studies to Genestack
        </p>

        <div className="form-group">
          <label>Genestack API Token</label>
          <input type="text" name="token" className="form-control" onChange={e => setApiKey(e.currentTarget.value)}/>
          <button className="btn btn-warning form-control" onClick={authenticate}>Authenticate</button>
        </div>
        <br />
        <div className="form-group">
          <label>Select a Study:</label>
          <select name="study" className="form-select ">
            <option>New Study</option>
            {studies.map((e) => (<option key="{e}">{e}</option>))}
          </select>
        </div>
        <br />
        <div className="form-group">
          <button className="btn btn-primary">Submit</button>
        </div>

      </main>

      <footer className={styles.footer}>
        <small>Contact HGI for help.</small>
      </footer>
    </div>
  )
}
