/**
Genestack Uploader
A HTTP server providing an API and a frontend for easy uploading to Genestack

Copyright (C) 2021, 2022 Genome Research Limited

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

import Head from "next/head";
import { useEffect, useState } from "react";
import styles from "../styles/Home.module.css";
import { apiRequest } from "../utils/api";

const studyNames = async (ignore_unauth) => {
  /**
   * We need to pull the names and accessions of the studies from the API
   * However, we also need to use the oppurtunity to check if the authentication
   * works. So, only once, we'll ignore it if its unauthorised (its not like the
   * API will return anything), and then prompt the user to enter a token, instead
   * of going in alarm bells ringing like HEY LOOK - YOU'RE NOT ALLOWED TO ACCESS
   * THIS DATA WHAT ARE YOU DOING, when actually its more like "Hey, I just haven't
   * typed in the token yet"
   */
  var studies = await apiRequest("studies", ignore_unauth);
  return studies.data.map((e) => ({
    title: e["Study Source"],
    accession: e["genestack:accession"],
  }));
};

const saveAPIToken = (token) => {
  /**
   * When we save the API token into localStorage, we also need to
   * save the time it gets saved, so we can have an expiry time
   */
  localStorage.setItem("Genestack-API-Token", token);
  localStorage.setItem("Genestack-API-Set-Time", Date.now());
};

export default function Home() {
  const [studies, setStudies] = useState([]);
  const [selectedStudy, setSelectedStudy] = useState("");

  const [softwareVersion, setSoftwareVersion] = useState("");
  const [genestackServer, setGenestackServer] = useState("");
  const [packageVersion, setPackageVersion] = useState("");

  /**
   * Let's go over how the unauthorisedWarning system works.
   *
   * By default its "", which won't display any warning.
   * When we load the page, it'll load whatever is in the localStorage
   *
   * When we press the authenticate button, and call the authenticate function,
   * we update the localStorage to "" (as in - there's no problem).
   *
   * If we're not ignoring unauthorised requests (like normal), we'll also hide the warning,
   * by setting unauthorisedWarning to "".
   *
   * Then, we'll look up the study names. When we do this, we call the apiRequest function
   * (in api.js)
   *
   * If the API call says we're not authorised, it'll set the localStorage value and redirect
   * us to the homepage, which'll therefore display the unauthorised message.
   *
   * The other part of this whole process is the keyCheck function, which runs on any (except this one)
   * page load. This **also** considers the expiry time, which is one hour after the key was set.
   *
   * If it has expired, it wipes the key, sets localStorage appropriately and redirects us to this page,
   * to display the warning about the token expiring.
   */
  const [unauthorisedWarning, setUnauthorisedWarning] = useState("");

  const authenticate = (ignore_unauth) => {
    localStorage.setItem("unauthorised", "");
    !ignore_unauth && setUnauthorisedWarning("");
    studyNames(ignore_unauth).then((names) => {
      setStudies(names);
    });
  };

  useEffect(() => {
    setUnauthorisedWarning(localStorage.getItem("unauthorised"));
    setStudies([]);
    authenticate(true);

    apiRequest("").then((d) => {
      setSoftwareVersion(d.data.version);
      setGenestackServer(d.data.server);
      setPackageVersion(d.data.package);
    });
  }, []);

  const goToStudy = () => {
    window.location = `${process.env.NEXT_PUBLIC_HOST}/studies/${selectedStudy}`;
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Genestack Uploader</title>
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>Genestack Uploader</h1>

        <p className={styles.description}>
          Easily upload new studies to Genestack
        </p>

        {unauthorisedWarning != "" && (
          <div className="alert alert-danger">{unauthorisedWarning}</div>
        )}

        <div className="form-group">
          <label>Genestack API Token</label>
          <input
            type="text"
            name="token"
            className="form-control"
            onChange={(e) => {
              saveAPIToken(e.currentTarget.value);
            }}
          />
          <button
            className="btn btn-warning form-control"
            onClick={() => {
              authenticate(false);
            }}
          >
            Authenticate
          </button>
        </div>
        <br />
        <div className="form-group">
          <label>Select a Study:</label>
          <select
            name="study"
            className="form-select"
            onChange={(e) => {
              setSelectedStudy(e.target.value);
            }}
          >
            <option value="">New Study</option>
            {studies.map((e) => (
              <option key={e.accession} value={e.accession}>
                {e.title}
              </option>
            ))}
          </select>
        </div>
        <br />
        <div className="form-group">
          <button className="btn btn-primary" onClick={goToStudy}>
            Submit
          </button>
        </div>
      </main>

      <footer className={styles.footer}>
        <small>
          <div className="text-center">
            The blue help button at the top of pages will give you information
            about the page.
          </div>
          <a href="https://confluence.sanger.ac.uk/display/HGI/Genestack+Uploader+App">
            Confluence Documentation
          </a>
          <code>
            Software Version: {softwareVersion} | Package Version:{" "}
            {packageVersion} | Server: {genestackServer}
          </code>
        </small>
      </footer>
    </div>
  );
}
