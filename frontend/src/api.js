export async function uploadPDF(file) {
  const formData = new FormData()
  formData.append("file", file)

  const res = await fetch("http://localhost:8000/upload", {
    method: "POST",
    body: formData
  })

  return res.json()
}

export async function submitSplits(pdfId, splits) {
  return fetch("/split", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pdf_id: pdfId, splits })
  })
}
