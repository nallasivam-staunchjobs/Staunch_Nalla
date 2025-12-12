import {
    candidateService,
    educationCertificateService,
    experienceCompanyService,
    additionalInfoService,
    previousCompanyService,
    clientJobService
} from './api';
import { clientJobs as clientJobsAPI, candidates } from '../../../api/api';
import { store } from '../../../Redux/Store';
import { StatusHistoryService } from './statusHistoryService';

import {
    mapFormDataToCandidate,
    mapFormDataToClientJob,
    mapFormDataToEducationCertificate,
    mapFormDataToExperienceCompany,
    mapFormDataToAdditionalInfo,
    mapFormDataToFeedback,
    mapExperienceCompaniesToPreviousCompanies,
    combineBackendDataToFormData
} from '../utils/dataMapper';

// Comprehensive candidate integration service
export class CandidateIntegrationService {

    // Create complete candidate with all related data using atomic transaction
    static async createCompleteCandidate(formData) {
        try {
            // Get user info from Redux store for executive name
            const state = store.getState();
            const user = state.auth;
            const executiveCode = user?.employeeCode;

            // Prepare all data for atomic creation
            const candidateData = mapFormDataToCandidate(formData, executiveCode);

            // Prepare client job data with defaults
            const clientJobFormData = {
                ...formData,
                clientName: formData.clientName || 'TBD',
                designation: formData.designation || 'TBD'
            };
            const clientJobData = mapFormDataToClientJob(clientJobFormData, null);
            delete clientJobData.candidate; // Remove candidate field as it will be set by backend

            // Prepare education certificates data
            let educationCertificatesData = [];
            if (formData.tenthCertificate !== undefined ||
                formData.twelfthCertificate !== undefined ||
                formData.diplomaCertificate !== undefined ||
                formData.ugCertificate !== undefined ||
                formData.pgCertificate !== undefined) {

                educationCertificatesData = mapFormDataToEducationCertificate(formData, null);
                educationCertificatesData = educationCertificatesData.map(cert => {
                    const { candidate, ...certWithoutCandidate } = cert;
                    return certWithoutCandidate;
                });
            }

            // Prepare experience company data
            let experienceCompanyData = null;
            if (formData.experienceCompanies && formData.experienceCompanies.length > 0) {
                experienceCompanyData = mapFormDataToExperienceCompany(formData, null);
                const { candidate, ...expWithoutCandidate } = experienceCompanyData;
                experienceCompanyData = expWithoutCandidate;
            }

            // Prepare previous companies data
            let previousCompaniesData = [];
            const prevCompaniesFromForm = mapExperienceCompaniesToPreviousCompanies(formData);
            if (prevCompaniesFromForm && prevCompaniesFromForm.length > 0) {
                previousCompaniesData = prevCompaniesFromForm.map(prevCompany => {
                    const { candidate, experience_company, ...prevWithoutRefs } = prevCompany;
                    return prevWithoutRefs;
                });
            }

            // Prepare additional info data
            let additionalInfoData = null;
            if (formData["two-wheeler"] !== undefined || formData.laptop !== undefined) {
                additionalInfoData = mapFormDataToAdditionalInfo(formData, null);
                const { candidate, ...additionalWithoutCandidate } = additionalInfoData;
                additionalInfoData = additionalWithoutCandidate;
            }

            // First, create the candidate with all related data
            const requestData = {
                candidate: candidateData,
                client_job: clientJobData,
                education_certificates: educationCertificatesData,
                experience_company: experienceCompanyData,
                previous_companies: previousCompaniesData,
                additional_info: additionalInfoData
            };

            // Create the candidate first
            const response = await candidates.createComplete(requestData);

            // Verify the candidate was actually created
            if (!response.data?.candidate?.id) {
                throw new Error('Candidate creation failed: No candidate ID in response');
            }

            // Get the candidate ID and client job ID from the response
            const candidateId = response.data.candidate.id;
            console.log('Candidate created with ID:', candidateId);

            // Create initial status history entry
            try {
                const initialRemarks = formData.remarks || 'interested';
                const clientJobId = response.data?.client_job?.id || response.data?.data?.client_job?.id;

                console.log('🔄 Creating status history with data:', {
                    candidateId,
                    initialRemarks,
                    executiveCode,
                    clientJobId,
                    clientName: formData.clientName
                });

                const statusResult = await StatusHistoryService.createInitialStatusHistory(
                    candidateId,
                    initialRemarks,
                    executiveCode,
                    `Candidate created with initial status: ${initialRemarks}`,
                    clientJobId, // client_job_id
                    null, // vendor_id (can be added later if available)
                    formData.clientName || null // client_name
                );

                console.log('✅ Initial status history created successfully:', statusResult);
            } catch (statusError) {
                console.error('❌ Failed to create initial status history:', statusError);
                console.error('❌ Status error details:', statusError.response?.data || statusError.message);
                // Don't fail the entire operation if status history fails
            }

            // Add feedback if it exists
            let feedbackResponse = null;
            const clientJobId = response.data?.client_job?.id || response.data?.data?.client_job?.id;

            if (formData.feedback && clientJobId) {
                try {
                    console.log('Adding feedback to client job:', clientJobId);
                    console.log('Feedback data:', {
                        feedback_text: formData.feedback,
                        remarks: formData.remarks || '',
                        nfd_date: formData.nextFollowUpDate || null,
                        ejd_date: formData.expectedJoiningDate || null,
                        ifd_date: formData.interviewFixedDate || null,
                        entry_by: formData.executiveName || 'System',
                        call_status: formData.call_status || 'call answered'
                    });

                    // Wait a moment to ensure the client job is fully created
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    feedbackResponse = await clientJobsAPI.addFeedback(clientJobId, {
                        feedback_text: formData.feedback,
                        remarks: formData.remarks || '',
                        nfd_date: formData.nextFollowUpDate || null,
                        ejd_date: formData.expectedJoiningDate || null,
                        ifd_date: formData.interviewFixedDate || null,
                        entry_by: formData.executiveName || 'System',
                        call_status: formData.call_status || 'call answered'
                    });

                    console.log('Feedback added successfully:', feedbackResponse);
                } catch (feedbackError) {
                    console.error('Failed to add feedback:', feedbackError);
                    console.error('Response data:', feedbackError.response?.data);

                    // Store the feedback to be added later
                    const pendingFeedback = {
                        clientJobId: clientJobId,
                        feedback: {
                            feedback_text: formData.feedback,
                            remarks: formData.remarks || '',
                            nfd_date: formData.nextFollowUpDate || null,
                            ejd_date: formData.expectedJoiningDate || null,
                            ifd_date: formData.interviewFixedDate || null,
                            entry_by: formData.executiveName || 'System',
                            call_status: formData.call_status || 'call answered',
                            timestamp: new Date().toISOString()
                        }
                    };

                    // Store in session storage to retry later
                    try {
                        const pendingFeedbacks = JSON.parse(sessionStorage.getItem('pendingFeedbacks') || '[]');
                        pendingFeedbacks.push(pendingFeedback);
                        sessionStorage.setItem('pendingFeedbacks', JSON.stringify(pendingFeedbacks));
                        console.log('Stored feedback for later retry');
                    } catch (storageError) {
                        console.error('Failed to store feedback in session storage:', storageError);
                    }
                }
            }

            return {
                ...response.data,
                feedback: feedbackResponse?.data || (formData.feedback ? {
                    feedback_text: formData.feedback,
                    remarks: formData.remarks || '',
                    nfd_date: formData.nextFollowUpDate || null,
                    ejd_date: formData.expectedJoiningDate || null,
                    ifd_date: formData.interviewFixedDate || null,
                    entry_by: formData.executiveName || 'System',
                    call_status: formData.call_status || 'call answered'
                } : null)
            };

        } catch (error) {
            console.error('Error in createCompleteCandidate:', error);
            throw error;
        }
    }

    // Update complete candidate with all related data
    static async updateCompleteCandidate(candidateId, formData) {
        try {
            // Get existing candidate to preserve original executive_name
            const existingCandidate = await candidateService.getCandidateById(candidateId);

            // Step 1: Update candidate (preserve original executive_name)
            const candidateData = mapFormDataToCandidate(formData, existingCandidate?.executive_name);
            const candidate = await candidateService.updateCandidate(candidateId, candidateData);

            // Check if remarks changed and create status history entry
            const state = store.getState();
            const user = state.auth;
            const executiveCode = user?.employeeCode;

            if (existingCandidate?.remarks !== formData.remarks && formData.remarks) {
                try {
                    await StatusHistoryService.createStatusChangeHistory(
                        candidateId,
                        formData.remarks,
                        executiveCode,
                        `Status updated from "${existingCandidate?.remarks || 'unknown'}" to "${formData.remarks}"`,
                        null, // client_job_id (will be set below if available)
                        null, // vendor_id
                        formData.clientName || null // client_name
                    );
                    console.log('✅ Status change history created for candidate:', candidateId);
                } catch (statusError) {
                    console.error('❌ Failed to create status change history:', statusError);
                }
            }

            // Step 2: Update or create client job
            let clientJob = null;
            if (formData.clientName && formData.designation) {
                const clientJobData = mapFormDataToClientJob(formData, candidateId);

                // Try to get existing client job
                const existingClientJobs = await clientJobService.getClientJobsByCandidate(candidateId);
                if (existingClientJobs.length > 0) {
                    clientJob = await clientJobService.updateClientJob(existingClientJobs[0].id, clientJobData);
                } else {
                    clientJob = await clientJobService.createClientJob(clientJobData);
                }
            }

            // Step 3: Update education certificates (preserve IDs by updating in place)
            const educationCertificates = [];
            if (formData.tenthCertificate !== undefined ||
                formData.twelfthCertificate !== undefined ||
                formData.diplomaCertificate !== undefined ||
                formData.ugCertificate !== undefined ||
                formData.pgCertificate !== undefined) {

                // Get existing certificates
                const existingCertificates = await educationCertificateService.getEducationCertificatesByCandidate(candidateId);
                const educationData = mapFormDataToEducationCertificate(formData, candidateId);

                // Create a map of existing certificates by type for easy lookup
                const existingCertMap = {};
                existingCertificates.forEach(cert => {
                    existingCertMap[cert.type] = cert;
                });

                // Update or create certificates
                for (const certData of educationData) {
                    const existingCert = existingCertMap[certData.type];

                    if (existingCert) {
                        // Update existing certificate (preserves ID)
                        const updatedCert = await educationCertificateService.updateEducationCertificate(existingCert.id, certData);
                        educationCertificates.push(updatedCert);
                    } else {
                        // Create new certificate if it doesn't exist
                        const newCert = await educationCertificateService.createEducationCertificate(certData);
                        educationCertificates.push(newCert);
                    }
                }

                // Remove certificates that are no longer needed
                const newCertTypes = educationData.map(cert => cert.type);
                for (const existingCert of existingCertificates) {
                    if (!newCertTypes.includes(existingCert.type)) {
                        await educationCertificateService.deleteEducationCertificate(existingCert.id);
                    }
                }
            }

            // Step 4: Update experience company
            let experienceCompany = null;
            if (formData.experienceCompanies && formData.experienceCompanies.length > 0) {
                const experienceData = mapFormDataToExperienceCompany(formData, candidateId);

                // Try to get existing experience company
                const existingExperience = await experienceCompanyService.getExperienceCompaniesByCandidate(candidateId);
                if (existingExperience.length > 0) {
                    experienceCompany = await experienceCompanyService.updateExperienceCompany(existingExperience[0].id, experienceData);
                } else {
                    experienceCompany = await experienceCompanyService.createExperienceCompany(experienceData);
                }
            }

            // Step 4.5: Update previous companies
            const previousCompanies = [];
            const previousCompaniesData = mapExperienceCompaniesToPreviousCompanies(formData);
            if (previousCompaniesData && previousCompaniesData.length > 0 && experienceCompany) {
                // Delete existing previous companies
                const existingPreviousCompanies = await previousCompanyService.getPreviousCompaniesByCandidate(candidateId);
                for (const prevComp of existingPreviousCompanies) {
                    await previousCompanyService.deletePreviousCompany(prevComp.id);
                }

                // Create new previous companies
                for (const prevCompanyData of previousCompaniesData) {
                    const previousCompanyPayload = {
                        ...prevCompanyData,
                        candidate: candidateId,
                        experience_company: experienceCompany.id
                    };
                    const prevCompany = await previousCompanyService.createPreviousCompany(previousCompanyPayload);
                    previousCompanies.push(prevCompany);
                }
            }

            // Step 5: Update additional info
            let additionalInfo = null;
            if (formData["two-wheeler"] !== undefined || formData.laptop !== undefined) {
                const additionalData = mapFormDataToAdditionalInfo(formData, candidateId);

                // Try to get existing additional info
                const existingAdditionalInfo = await additionalInfoService.getAdditionalInfoByCandidate(candidateId);
                if (existingAdditionalInfo.length > 0) {
                    additionalInfo = await additionalInfoService.updateAdditionalInfo(existingAdditionalInfo[0].id, additionalData);
                } else {
                    additionalInfo = await additionalInfoService.createAdditionalInfo(additionalData);
                }
            }

            // Step 6:
            // Remove the duplicate feedback check and always add the feedback
            let feedback = null;
            if (formData.feedback && clientJob) {
                // Check if this feedback already exists to prevent duplicates
                try {
                    const existingFeedback = await clientJobs.getFeedbackEntries(clientJob.id);
                    const feedbackExists = existingFeedback.feedback_entries?.some(entry =>
                        entry.feedback === formData.feedback &&
                        entry.remarks === (formData.remarks || '')
                    );

                    if (!feedbackExists) {
                        feedback = await clientJobs.addFeedback(clientJob.id, {
                            feedback_text: formData.feedback,
                            remarks: formData.remarks || '',
                            nfd_date: formData.nextFollowUpDate || null,
                            ejd_date: formData.expectedJoiningDate || null,
                            ifd_date: formData.interviewFixedDate || null,
                            entry_by: formData.executiveName || 'System',
                            call_status: formData.call_status || ''
                        });
                    }
                } catch (error) {
                    // If check fails, still add feedback but log the issue
                    feedback = await clientJobs.addFeedback(clientJob.id, {
                        feedback_text: formData.feedback,
                        remarks: formData.remarks || '',
                        nfd_date: formData.nextFollowUpDate || null,
                        ejd_date: formData.expectedJoiningDate || null,
                        ifd_date: formData.interviewFixedDate || null,
                        entry_by: formData.executiveName || 'System',
                        call_status: formData.call_status || ''
                    });
                }
            }

            return {
                candidate,
                clientJob,
                educationCertificates,
                experienceCompany,
                previousCompanies,
                additionalInfo,
                feedback
            };

        } catch (error) {
            throw error;
        }
    }

    // Get complete candidate data
    static async getCompleteCandidate(candidateId) {
        try {
            // Get candidate
            const candidate = await candidateService.getCandidateById(candidateId);

            // Get related data
            const clientJobs = await clientJobService.getClientJobsByCandidate(candidateId);
            const educationCertificates = await educationCertificateService.getEducationCertificatesByCandidate(candidateId);
            const experienceCompanies = await experienceCompanyService.getExperienceCompaniesByCandidate(candidateId);
            const previousCompanies = await previousCompanyService.getPreviousCompaniesByCandidate(candidateId);
            const additionalInfo = await additionalInfoService.getAdditionalInfoByCandidate(candidateId);
            // Get feedback from all client jobs for this candidate
            let feedbacks = [];
            for (const clientJob of clientJobs) {
                try {
                    const clientJobFeedback = await clientJobsAPI.getFeedbackEntries(clientJob.id);
                    if (clientJobFeedback && clientJobFeedback.feedback_entries) {
                        feedbacks = [...feedbacks, ...clientJobFeedback.feedback_entries];
                    }
                } catch (error) {
                }
            }

            // Combine all data into form data format
            const formData = combineBackendDataToFormData(
                candidate,
                clientJobs,
                educationCertificates,
                experienceCompanies,
                previousCompanies,
                additionalInfo,
                feedbacks
            );

            return {
                candidate,
                clientJobs,
                educationCertificates,
                experienceCompanies,
                previousCompanies,
                additionalInfo,
                feedbacks,
                formData
            };

        } catch (error) {
            throw error;
        }
    }

    // Delete complete candidate with all related data
    static async deleteCompleteCandidate(candidateId) {
        try {
            // Delete related data first
            const clientJobs = await clientJobService.getClientJobsByCandidate(candidateId);
            for (const clientJob of clientJobs) {
                await clientJobService.deleteClientJob(clientJob.id);
            }

            const educationCertificates = await educationCertificateService.getEducationCertificatesByCandidate(candidateId);
            for (const cert of educationCertificates) {
                await educationCertificateService.deleteEducationCertificate(cert.id);
            }

            const experienceCompanies = await experienceCompanyService.getExperienceCompaniesByCandidate(candidateId);
            for (const exp of experienceCompanies) {
                await experienceCompanyService.deleteExperienceCompany(exp.id);
            }

            const previousCompanies = await previousCompanyService.getPreviousCompaniesByCandidate(candidateId);
            for (const prevComp of previousCompanies) {
                await previousCompanyService.deletePreviousCompany(prevComp.id);
            }

        } catch (error) {
            throw error;
        }
    }

    // Search candidates
    static async searchCandidates(searchTerm) {
        try {
            const candidates = await candidateService.searchCandidates(searchTerm);
            return candidates;
        } catch (error) {
            throw error;
        }
    }

    // Get all candidates with basic info
    static async getAllCandidates() {
        try {
            const candidates = await candidateService.getAllCandidates();
            return candidates;
        } catch (error) {
            throw error;
        }
    }

    static async uploadResume(candidateId, file) {
        try {
            const response = await candidateService.uploadResume(candidateId, file);
            return response.data;
        } catch (error) {
            throw error;
        }
    }

    static async downloadResume(candidateId) {
        try {
            const response = await candidateService.downloadResume(candidateId);
            return response.data;
        } catch (error) {
            throw error;
        }
    }

    // Update only scoring-related data (for EditScoreModal)
    static async updateScoringData(candidateId, formData) {
        try {
            // Extract numeric candidate ID from compound ID if needed
            let numericCandidateId = candidateId;
            if (typeof candidateId === 'string' && candidateId.includes('-')) {
                numericCandidateId = candidateId.split('-')[0];
            }
            numericCandidateId = parseInt(numericCandidateId, 10);

            const results = {};

            // Step 1: Update education certificates (preserve IDs by updating in place)
            if (formData.tenthCertificate !== undefined ||
                formData.twelfthCertificate !== undefined ||
                formData.diplomaCertificate !== undefined ||
                formData.ugCertificate !== undefined ||
                formData.pgCertificate !== undefined) {

                // Get existing certificates
                const existingCertificates = await educationCertificateService.getEducationCertificatesByCandidate(numericCandidateId);
                const educationData = mapFormDataToEducationCertificate(formData, numericCandidateId);

                // Create a map of existing certificates by type for easy lookup
                const existingCertMap = {};
                existingCertificates.forEach(cert => {
                    existingCertMap[cert.type] = cert;
                });

                // Update or create certificates
                const educationCertificates = [];
                for (const certData of educationData) {
                    const existingCert = existingCertMap[certData.type];

                    if (existingCert) {
                        // Update existing certificate (preserves ID)
                        const updatedCert = await educationCertificateService.updateEducationCertificate(existingCert.id, certData);
                        educationCertificates.push(updatedCert);
                    } else {
                        // Create new certificate if it doesn't exist
                        const newCert = await educationCertificateService.createEducationCertificate(certData);
                        educationCertificates.push(newCert);
                    }
                }

                // Remove certificates that are no longer needed
                const newCertTypes = educationData.map(cert => cert.type);
                for (const existingCert of existingCertificates) {
                    if (!newCertTypes.includes(existingCert.type)) {
                        await educationCertificateService.deleteEducationCertificate(existingCert.id);
                    }
                }

                results.education = educationCertificates;
            }

            // Step 2: Update experience company
            if (formData.experienceCompanies && formData.experienceCompanies.length > 0) {
                const experienceData = mapFormDataToExperienceCompany(formData, numericCandidateId);

                // Try to get existing experience company
                const existingExperience = await experienceCompanyService.getExperienceCompaniesByCandidate(numericCandidateId);
                let experienceCompany;
                if (existingExperience.length > 0) {
                    experienceCompany = await experienceCompanyService.updateExperienceCompany(existingExperience[0].id, experienceData);
                } else {
                    experienceCompany = await experienceCompanyService.createExperienceCompany(experienceData);
                }
                results.experience = experienceCompany;

                // Update previous companies
                const previousCompaniesData = mapExperienceCompaniesToPreviousCompanies(formData);
                if (previousCompaniesData && previousCompaniesData.length > 0) {
                    // Delete existing previous companies
                    const existingPreviousCompanies = await previousCompanyService.getPreviousCompaniesByCandidate(numericCandidateId);
                    for (const prevComp of existingPreviousCompanies) {
                        await previousCompanyService.deletePreviousCompany(prevComp.id);
                    }

                    // Create new previous companies
                    const previousCompanies = [];
                    for (const prevCompanyData of previousCompaniesData) {
                        const previousCompanyPayload = {
                            ...prevCompanyData,
                            candidate: numericCandidateId,
                            experience_company: experienceCompany.id
                        };
                        const prevCompany = await previousCompanyService.createPreviousCompany(previousCompanyPayload);
                        previousCompanies.push(prevCompany);
                    }
                    results.previousCompanies = previousCompanies;
                }
            }

            // Step 3: Update additional info
            if (formData["two-wheeler"] !== undefined || formData.laptop !== undefined) {
                const additionalData = mapFormDataToAdditionalInfo(formData, numericCandidateId);

                // Try to get existing additional info
                const existingAdditionalInfo = await additionalInfoService.getAdditionalInfoByCandidate(numericCandidateId);
                let additionalInfo;
                if (existingAdditionalInfo.length > 0) {
                    additionalInfo = await additionalInfoService.updateAdditionalInfo(existingAdditionalInfo[0].id, additionalData);
                } else {
                    additionalInfo = await additionalInfoService.createAdditionalInfo(additionalData);
                }
                results.additionalInfo = additionalInfo;
            }

            return results;
        } catch (error) {
            throw error;
        }
    }

}

export default CandidateIntegrationService;
