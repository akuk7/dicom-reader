import { BrowserRouter, Route, Routes } from "react-router-dom"
import Home from "./Home"


const App:React.FC = ()=>{
return(
  <BrowserRouter basename="/dicom-reader">
  <Routes>
    <Route path="/" element={<Home />} />
  </Routes>
  </BrowserRouter>
)
}
export default App