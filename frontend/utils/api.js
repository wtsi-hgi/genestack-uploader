export const apiRequest = async (endpoint) => {
    const r = await fetch(`/api/${endpoint}`, {
        headers: {
            "Genestack-API-Token": localStorage.getItem("Genestack-API-Token")
        }
    })
    return await r.json()
  }

export const postApiReqiest = async (endpoint, body) => {
    const r = await fetch(`/api/${endpoint}`, {
        method: "POST",
        headers: {
            "Genestack-API-Token": localStorage.getItem("Genestack-API-Token")
        },
        body: JSON.stringify(body)
    })
    return r.ok
}

export const keyCheck = () => {
    if (localStorage.getItem("Genestack-API-Token") == null) {
        window.location = "/"
    }
}