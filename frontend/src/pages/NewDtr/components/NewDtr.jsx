import { AnimatePresence } from 'framer-motion'
import SearchView from './SearchView'
import RegistrationView from './RegistrationView'
import ViewModal from './ViewModal'
import { Toaster } from 'react-hot-toast'
import { useAppContext } from '../../../context/AppContext'

const NewDtr = () => {
  const { state } = useAppContext()
  const { currentView } = state

  return (
    <div className="min-h-screen">
      <Toaster position='top-center'/>
      <div className="max-w-full mx-auto">
        <AnimatePresence mode="wait">
          {currentView === "search" && <SearchView key="search-view" />}
          {currentView === "registration" && <RegistrationView key="registration-view" />}
        </AnimatePresence>
      </div>
      <ViewModal />
    </div>
  )
}

export default NewDtr