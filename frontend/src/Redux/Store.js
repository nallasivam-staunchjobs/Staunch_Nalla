import { configureStore } from '@reduxjs/toolkit';
import jobPostingReducer from './jobPostingSlice';
import formReducer from './formSlice';
import candidatesReducer from './candidatesSlice';
import uiReducer from './uiSlice';
import masterDataReducer from './masterDataSlice';
import userManagementReducer from './userManagementSlice';
import vendorManagementReducer from './vendorManagementSlice';
import dtrReducer from './dtrSlice';
import calendarReducer from './calendarSlice';
import dashboardReducer from './dashboardSlice';
import authReducer from './authSlice';

// --- DevTools Sanitizers ---
const stateSanitizer = (state) => ({
    ...state,
    form: {
        ...state.form,
        resumeFile: state.form?.resumeFile ? '[FILE]' : null,
        resumePreview: state.form?.resumePreview ? '[PREVIEW]' : null,
    },
    auth: {
        ...state.auth,
        token: state.auth?.token ? '[TOKEN]' : null,
        sessionTimeout: state.auth?.sessionTimeout ? '[SESSION_TIMEOUT]' : null,
        lastActivity: state.auth?.lastActivity ? '[LAST_ACTIVITY]' : null,
        lockoutTime: state.auth?.lockoutTime ? '[LOCKOUT_TIME]' : null,
        passwordResetExpiry: state.auth?.passwordResetExpiry ? '[RESET_EXPIRY]' : null,
    },
    dtr: {
        ...state.dtr,
        timeRecords: Array.isArray(state.dtr?.timeRecords) && state.dtr.timeRecords.length > 50
            ? `[${state.dtr.timeRecords.length} RECORDS]` : state.dtr?.timeRecords,
    },
    calendar: {
        ...state.calendar,
        events: Array.isArray(state.calendar?.events) && state.calendar.events.length > 50
            ? `[${state.calendar.events.length} EVENTS]` : state.calendar?.events,
    },
    dashboard: {
        ...state.dashboard,
        recentActivities: Array.isArray(state.dashboard?.recentActivities) && state.dashboard.recentActivities.length > 50
            ? `[${state.dashboard.recentActivities.length} ACTIVITIES]` : state.dashboard?.recentActivities,
        lastUpdated: state.dashboard?.lastUpdated ? '[LAST_UPDATED]' : null,
    },
});

const actionSanitizer = (action) => {
    if (action.type === 'form/setResumeFile') {
        return { ...action, payload: '[FILE]' };
    }
    if (action.type === 'form/setResumePreview') {
        return { ...action, payload: '[PREVIEW]' };
    }
    if (action.type === 'auth/loginSuccess' && action.payload?.token) {
        return { ...action, payload: { ...action.payload, token: '[TOKEN]' } };
    }
    if (action.type === 'dtr/timeIn' || action.type === 'dtr/timeOut') {
        return { ...action, payload: '[TIME_RECORD]' };
    }
    if (action.type === 'calendar/addEvent' || action.type === 'calendar/updateEvent') {
        return { ...action, payload: '[EVENT]' };
    }
    if (action.type === 'dashboard/addActivity' || action.type === 'dashboard/addNotification') {
        return { ...action, payload: '[ACTIVITY]' };
    }
    return action;
};

export const store = configureStore({
    reducer: {
        jobPosting: jobPostingReducer,
        form: formReducer,
        candidates: candidatesReducer,
        ui: uiReducer,
        masterData: masterDataReducer,
        userManagement: userManagementReducer,
        vendorManagement: vendorManagementReducer,
        dtr: dtrReducer,
        calendar: calendarReducer,
        dashboard: dashboardReducer,
        auth: authReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: [
                    'form/setResumeFile', 
                    'form/setResumePreview',
                    'auth/loginSuccess',
                    'auth/logout',
                    'auth/autoLogout',
                    'dtr/timeIn',
                    'dtr/timeOut',
                    'calendar/addEvent',
                    'calendar/updateEvent',
                    'dashboard/addActivity',
                    'dashboard/addNotification'
                ],
                ignoredPaths: [
                    'form.resumeFile', 
                    'form.resumePreview',
                    'auth.token',
                    'auth.sessionTimeout',
                    'auth.lastActivity',
                    'auth.lockoutTime',
                    'auth.passwordResetExpiry',
                    'dtr.timeRecords',
                    'calendar.events',
                    'dashboard.recentActivities',
                    'dashboard.lastUpdated'
                ],
            },
        }),
    devTools: {
        stateSanitizer,
        actionSanitizer,
    },

});