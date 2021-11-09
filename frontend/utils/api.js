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

export const apiRequest = async (endpoint, ignore_unauth = false) => {
  const r = await fetch(
    `${process.env.NEXT_PUBLIC_HOST}/api${
      endpoint != "" ? "/" : ""
    }${endpoint}`,
    {
      headers: {
        "Genestack-API-Token": localStorage.getItem("Genestack-API-Token"),
      },
    }
  );
  if ((r.status == 403 || r.status == 401) && !ignore_unauth) {
    localStorage.setItem("unauthorised", "Unauthorised");
    window.location = process.env.NEXT_PUBLIC_HOST + "/";
    return null;
  }
  return await r.json();
};

export const postApiReqiest = async (endpoint, body) => {
  const r = await fetch(`${process.env.NEXT_PUBLIC_HOST}/api/${endpoint}`, {
    method: "POST",
    headers: {
      "Genestack-API-Token": localStorage.getItem("Genestack-API-Token"),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return [r.ok, await r.text()];
};

export const keyCheck = () => {
  if (localStorage.getItem("Genestack-API-Token") == null) {
    window.location = process.env.NEXT_PUBLIC_HOST + "/";
  }

  // 1 Hour Expiry Time
  if (localStorage.getItem("Genestack-API-Set-Time") < Date.now() - 3600000) {
    localStorage.setItem("Genestack-API-Token", null);
    localStorage.setItem("unauthorised", "Token Time Expired");
    window.location = process.env.NEXT_PUBLIC_HOST + "/";
  }
};
