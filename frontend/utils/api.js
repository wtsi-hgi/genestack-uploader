export const apiRequest = async (endpoint) => {
    const r = await fetch(`/api/${endpoint}`, {
        headers: {
            "Genestack-API-Token": localStorage.getItem("Genestack-API-Token")
        }
    })
    return await r.json()
  }

export const keyCheck = () => {
    if (localStorage.getItem("Genestack-API-Token") == null) {
        window.location = "/"
    }
}