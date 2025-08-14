import { BrowserRouter, Route, Routes } from "react-router-dom"
import Home from "./Home"
import OldHome from "./OldHome"


const App:React.FC = ()=>{
return(
  <BrowserRouter>
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/old" element={<OldHome />} />
  </Routes>
  </BrowserRouter>
)
}
export default App