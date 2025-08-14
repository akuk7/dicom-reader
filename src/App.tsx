import { BrowserRouter, Route, Routes } from "react-router-dom"
import Home from "./Home"


const App:React.FC = ()=>{
  const basename =
  import.meta.env.MODE === 'production' ? '/dicom-reader' : '/'
return(
  <BrowserRouter basename={basename}>
  <Routes>
    <Route path="/" element={<Home />} />
  </Routes>
  </BrowserRouter>
)
}
export default App