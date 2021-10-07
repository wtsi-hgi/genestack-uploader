import Head from 'next/head'
import styles from '../styles/Home.module.css'

export default function Home() {
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

        <form>
          <div className="form-group">
            <label>Genestack API Token</label>
            <input type="text" name="token" className="form-control" />
          </div>
          <br />
          <div className="form-group">
            <label>Select a Study:</label>
            <select name="study" className="form-select ">
              <option>1</option>
              <option>2</option>
            </select>
          </div>
          <br />
          <div className="form-group">
            <button className="btn btn-primary">Submit</button>
          </div>
        </form>


      </main>

      <footer className={styles.footer}>
        <small>Contact HGI for help.</small>
      </footer>
    </div>
  )
}
