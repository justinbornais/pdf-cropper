import { uploadPDF } from "./api"

export default function UploadPDF({ onUpload }) {
  const handleChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const data = await uploadPDF(file)
    onUpload(data.pdf_id)
  }

  return (
    <div>
      <input type="file" accept="application/pdf" onChange={handleChange} />
    </div>
  )
}
