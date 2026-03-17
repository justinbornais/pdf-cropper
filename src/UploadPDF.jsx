export default function UploadPDF({ onUpload }) {
  const handleChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    // Pass the File object directly — no HTTP upload needed
    onUpload(file)
  }

  return (
    <div>
      <input type="file" accept="application/pdf" onChange={handleChange} />
    </div>
  )
}
