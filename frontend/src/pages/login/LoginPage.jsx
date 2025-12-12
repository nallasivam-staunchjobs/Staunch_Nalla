import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import logo from '../../assets/staunchLogo.jpg';
import summa from '../../assets/4565.jpg';
import { useAuth } from '../../Redux/hooks'; // Import useAuth hook

// Animation variants (keeping these as is to preserve your UI)
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            when: "beforeChildren",
            staggerChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
        y: 0,
        opacity: 1,
        transition: {
            type: "spring",
            stiffness: 100,
            damping: 10
        }
    }
};

const cardVariants = {
    hidden: { scale: 0.95, opacity: 0 },
    visible: {
        scale: 1,
        opacity: 1,
        transition: {
            type: "spring",
            stiffness: 100,
            delay: 0.2
        }
    }
};

const bgVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            duration: 1
        }
    }
};

export default function LoginPage() {
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const navigate = useNavigate();
    // Get Redux state and login function from useAuth hook
    // 'loading' and 'error' will now come from Redux state, not local state
    const { login, isAuthenticated, loading, error } = useAuth();

    // Redirect to the dashboard if authenticated
    useEffect(() => {
        if (isAuthenticated) {
            navigate('/'); // Navigate to the new homepage ('/')
        }
    }, [isAuthenticated, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Detect if input is phone number or employee code
        const isPhoneNumber = /^\d{10,}$/.test(phone); // 10+ digits = phone number
        const isEmployeeCode = /^[A-Z]{2,}\d+$/.test(phone); // Letters + numbers = employee code
        
        let loginData = { password };
        
        if (isPhoneNumber) {
            loginData.phone = phone;
            console.log("Submitting login with phone:", { phone, password });
        } else if (isEmployeeCode || phone.length < 10) {
            // Treat as employee code if it matches pattern or is too short to be phone
            loginData.employeeCode = phone;
            console.log("Submitting login with employeeCode:", { employeeCode: phone, password });
        } else {
            // Default to phone for other cases
            loginData.phone = phone;
            console.log("Submitting login with phone (default):", { phone, password });
        }
        
        // The 'login' function from useAuth now handles setting loading/error states in Redux
        await login(loginData);
    };

    const handlePhoneChange = (e) => {
        setPhone(e.target.value);
    };

    const handlePasswordChange = (e) => {
        setPassword(e.target.value);
    };

    const inactiveMessages = ["Employee is inactive.", "Account is inactive."];

    const displayError = inactiveMessages.includes(error)
        ? "Your account is inactive. Please contact the administrator."
        : error;

    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="min-h-screen flex bg-gradient-to-br from-blue-50 via-white to-indigo-50 justify-center items-center p-4"
        >
            {/* Animated background elements */}
            <motion.div
                variants={bgVariants}
                className="fixed inset-0 overflow-hidden pointer-events-none"
            >
                {[...Array(5)].map((_, i) => (
                    <motion.div
                        key={i}
                        initial={{ y: -100, x: Math.random() * 1000 - 100, opacity: 0 }}
                        animate={{
                            y: 1000,
                            opacity: [0, 0.3, 0],
                            x: Math.random() * 200 - 100 + (i * 200)
                        }}
                        transition={{
                            duration: 10 + Math.random() * 10,
                            repeat: Infinity,
                            delay: Math.random() * 5
                        }}
                        className="absolute rounded-full bg-blue-200"
                        style={{
                            width: `${Math.random() * 100 + 50} px`,
                            height: `${Math.random() * 100 + 50}px`,
                            filter: 'blur(20px)'
                        }}
                    />
                ))}
            </motion.div>

            {/* Responsive Container */}
            <motion.div
                variants={cardVariants}
                className="w-full max-w-[800px] h-auto min-h-[600px] bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 flex flex-col lg:flex-row overflow-hidden shadow-2xl"
                whileHover={{ scale: 1.005 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
                {/* Left Section - Hidden on mobile, visible on larger screens */}
                <motion.div
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.3, type: "spring" }}
                    className="hidden lg:flex lg:w-[400px] bg-gradient-to-br from-blue-600 to-indigo-700 flex-col justify-center items-center p-8 text-center relative overflow-hidden"
                >
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-10">
                        <motion.div
                            animate={{
                                y: [0, -20, 0],
                                x: [0, 10, 0]
                            }}
                            transition={{
                                duration: 10,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                            className="absolute top-10 left-10 w-20 h-20 bg-white rounded-full"
                        />
                        <motion.div
                            animate={{
                                y: [0, 30, 0],
                                x: [0, -15, 0]
                            }}
                            transition={{
                                duration: 8,
                                repeat: Infinity,
                                ease: "easeInOut",
                                delay: 1
                            }}
                            className="absolute bottom-20 right-10 w-16 h-16 bg-white rounded-full"
                        />
                        <motion.div
                            animate={{
                                y: [0, -15, 0],
                                x: [0, 20, 0]
                            }}
                            transition={{
                                duration: 12,
                                repeat: Infinity,
                                ease: "easeInOut",
                                delay: 2
                            }}
                            className="absolute top-1/2 left-1/4 w-12 h-12 bg-white rounded-full"
                        />
                    </div>

                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="space-y-6 relative z-10"
                    >
                        <motion.h1 variants={itemVariants} className="text-4xl font-bold text-white">
                            Welcome Back
                        </motion.h1>
                        <motion.p variants={itemVariants} className="text-lg text-blue-100 max-w-md mx-auto">
                            Manage your recruitment process with <span className="font-semibold text-yellow-300">Staunch Jobs</span>.
                        </motion.p>
                        <motion.div
                            variants={itemVariants}
                            className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mt-8"
                            whileHover={{ scale: 1.05 }}
                        >
                            <img
                                src={summa}
                                alt="HR Recruitment Illustration"
                                className="mx-auto"
                                width={300}
                                height={300}
                            />
                        </motion.div>
                    </motion.div>
                </motion.div>

                {/* Right Section - Full width on mobile, fixed width on larger screens */}
                <motion.div
                    initial={{ x: 50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.4, type: "spring" }}
                    className="w-full lg:w-[400px] flex flex-col justify-center items-center p-6 lg:p-8"
                >
                    <div className="w-full max-w-sm">
                        <motion.div
                            variants={itemVariants}
                            className="mb-8 text-center"
                        >
                            {/* Show logo and title on mobile */}
                            <div className="lg:hidden mb-6">
                                <motion.h1
                                    className="text-xl font-bold text-gray-900 mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text"
                                    whileHover={{ scale: 1.02 }}
                                >
                                    Welcome Back
                                </motion.h1>
                                <motion.p
                                    className="text-sm text-gray-600"
                                    whileHover={{ scale: 1.01 }}
                                >
                                    Manage your recruitment process with <span className="font-semibold text-blue-600">Staunch Jobs</span>
                                </motion.p>
                            </div>

                            <div className="flex items-center justify-center space-x-4 text-gray-500 text-sm">
                                <motion.img
                                    src={logo}
                                    alt="Staunch Jobs"
                                    className="h-10 lg:h-12"
                                    width={200}
                                    height={60}
                                    whileHover={{
                                        scale: 1.1,
                                        rotate: [0, 5, -5, 0],
                                    }}
                                    transition={{
                                        scale: { type: "spring", stiffness: 300 },
                                        rotate: { duration: 0.5 }
                                    }}
                                />
                            </div>
                        </motion.div>

                        {/* Error Message */}
                        {error && (
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg"
                            >
                                <p className="text-sm text-red-600 flex items-center">
                                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    {displayError}
                                </p>
                            </motion.div>
                        )}

                        <motion.form
                            onSubmit={handleSubmit}
                            className="space-y-6"
                            variants={containerVariants}
                        >
                            <motion.div variants={itemVariants} className="space-y-2">
                                <label htmlFor="phone" className="block text-sm font-semibold text-gray-700">
                                    Employee Code
                                </label>
                                <div className="relative">
                                    <motion.input
                                        type="text"
                                        id="phone"
                                        value={phone}
                                        onChange={handlePhoneChange}
                                        placeholder="Enter employee code"
                                        autoComplete="username"
                                        required
                                        className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/50 backdrop-blur-sm outline-0"
                                        whileFocus={{
                                            scale: 1.01,
                                            boxShadow: "0 0 0 2px rgba(59, 130, 246, 0.5)"
                                        }}
                                    />
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div variants={itemVariants} className="space-y-2">
                                <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                                    Password
                                </label>
                                <div className="relative">
                                    <motion.input
                                        type={showPassword ? "text" : "password"}
                                        id="password"
                                        value={password}
                                        onChange={handlePasswordChange}
                                        placeholder="Enter your password"
                                        required
                                        autoComplete="current-password"
                                        className="block w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/50 backdrop-blur-sm outline-0"
                                        whileFocus={{
                                            scale: 1.01,
                                            boxShadow: "0 0 0 2px rgba(59, 130, 246, 0.5)"
                                        }}
                                    />
                                    <motion.button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                                        whileTap={{ scale: 0.9 }}
                                    >
                                        {showPassword ? (
                                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                            </svg>
                                        ) : (
                                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        )}
                                    </motion.button>
                                </div>
                            </motion.div>

                            <motion.div variants={itemVariants} className="flex items-center">
                                <motion.input
                                    id="remember-me"
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-colors"
                                    whileTap={{ scale: 0.9 }}
                                />
                                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                                    Remember me
                                </label>
                            </motion.div>

                            <motion.div variants={itemVariants}>
                                <motion.button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    {loading ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Signing in...
                                        </>
                                    ) : (
                                        'Sign in'
                                    )}
                                </motion.button>
                            </motion.div>
                        </motion.form>
                    </div>
                </motion.div>
            </motion.div>
        </motion.div>
    );
}
