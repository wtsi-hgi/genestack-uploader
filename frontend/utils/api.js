export const apiRequest = async (endpoint, ignore_unauth = false) => {
    const r = await fetch(`/api/${endpoint}`, {
        headers: {
            "Genestack-API-Token": localStorage.getItem("Genestack-API-Token")
        }
    })
    if (r.status == 403 && !ignore_unauth) {
        localStorage.setItem("unauthorised", true);
        window.location = "/"
        return null;
    }
    return await r.json()
  }

export const postApiReqiest = async (endpoint, body) => {
    const r = await fetch(`/api/${endpoint}`, {
        method: "POST",
        headers: {
            "Genestack-API-Token": localStorage.getItem("Genestack-API-Token"),
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    })
    return [r.ok, await r.text()]
}

export const keyCheck = () => {
    if (localStorage.getItem("Genestack-API-Token") == null) {
        window.location = "/"
    }
}