export const apiRequest = async (endpoint) => {
    const r = await fetch(`/api/${endpoint}`, {
        headers: {
            "Genestack-API-Token": localStorage.getItem("Genestack-API-Token")
        }
    })
    return await r.json()
  }