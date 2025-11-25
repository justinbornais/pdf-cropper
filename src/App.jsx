import { useState } from "react";
import PDFViewer from "./PDFViewer";
import "./App.css";

function App() {
  const [fileData, setFileData] = useState(null);

  const handleFile = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const buffer = await file.arrayBuffer();
    setFileData(buffer);
  };

  return (
    <div className="app">
      <h1>PDF Hymn Splitter</h1>

      <input type="file" accept="application/pdf" onChange={handleFile} /><br />

      {fileData && <PDFViewer file={fileData} />}
    </div>
  );
}

export default App;
