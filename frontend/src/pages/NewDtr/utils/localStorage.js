import toast from 'react-hot-toast'

export const saveFormProgress = (step, data, resumeFile = null, resumePreviewUrl = null) => {
  try {
    const progressData = {
      currentStep: step,
      formData: data,
      completedSteps: getCompletedSteps(step),
      timestamp: new Date().toISOString(),
      resumePreviewUrl: resumePreviewUrl,
      hasResume: !!resumeFile,
      resumeFileName: resumeFile?.name || null,
      resumeFileType: resumeFile?.type || null,
    }

    localStorage.setItem("candidateRegistrationProgress", JSON.stringify(progressData))

    if (resumeFile) {
      const reader = new FileReader()
      reader.onload = (e) => {
        localStorage.setItem("candidateResumeFile", e.target.result)
        localStorage.setItem("candidateResumeFileName", resumeFile.name)
        localStorage.setItem("candidateResumeFileType", resumeFile.type)
      }
      reader.onerror = (error) => {
        toast.error("Failed to save resume file")
      }
      reader.readAsDataURL(resumeFile)
    }
  } catch (error) {
    toast.error("Failed to save form progress")
  }
}

export const loadFormProgress = () => {
  try {
    const saved = localStorage.getItem("candidateRegistrationProgress")
    if (!saved) return null

    const progressData = JSON.parse(saved)

    if (progressData.hasResume) {
      const resumeData = localStorage.getItem("candidateResumeFile")
      const resumeFileName = localStorage.getItem("candidateResumeFileName")
      const resumeFileType = localStorage.getItem("candidateResumeFileType")

      if (resumeData && resumeFileName && resumeFileType) {
        progressData.resumePreviewUrl = resumeData
        progressData.resumeFileName = resumeFileName
        progressData.resumeFileType = resumeFileType
      }
    }

    return progressData
  } catch (error) {
    toast.error("Failed to load saved progress")
    return null
  }
}

export const clearFormProgress = () => {
  try {
    localStorage.removeItem("candidateRegistrationProgress")
    localStorage.removeItem("candidateResumeFile")
    localStorage.removeItem("candidateResumeFileName")
    localStorage.removeItem("candidateResumeFileType")
  } catch (error) {
    toast.error("Failed to clear saved progress")
  }
}

const getCompletedSteps = (currentStep) => {
  const completed = []
  for (let i = 1; i < currentStep; i++) {
    completed.push(i)
  }
  return completed
}