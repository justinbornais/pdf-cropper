export default function UploadPDF({ onUpload }) {
  const handleChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    onUpload(file)
  }

  return (
    <div className="upload-screen">
      <div className="upload-card">
        <div className="upload-icon">📄</div>
        <h2>Upload a PDF</h2>
        <p>Select a file to begin splitting and cropping pages.<br />Your file never leaves your device.</p>
        <label className="upload-label">
          Choose File
          <input type="file" accept="application/pdf" onChange={handleChange} />
        </label>
      </div>
    </div>
  )
}
