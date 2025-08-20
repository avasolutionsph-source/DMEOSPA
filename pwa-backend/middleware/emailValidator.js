// Email Uniqueness Validator
// Ensures no email is used twice anywhere in the system

const User = require('../models/User');

async function checkEmailUniqueness(email) {
    try {
        // Check in main User collection (business owners, employees, etc.)
        const existingUser = await User.findOne({ 
            email: email.toLowerCase() 
        });

        if (existingUser) {
            return {
                exists: true,
                location: 'user_account',
                userType: existingUser.role || 'user',
                message: `Email already registered as ${existingUser.role || 'user'}`
            };
        }

        // Check in employees array within user documents (nested employees)
        const userWithEmployee = await User.findOne({
            'employees.email': email.toLowerCase()
        });

        if (userWithEmployee) {
            return {
                exists: true,
                location: 'employee_account',
                userType: 'employee',
                message: 'Email already registered as an employee'
            };
        }

        // Email is unique
        return {
            exists: false,
            message: 'Email is available'
        };

    } catch (error) {
        console.error('Email check error:', error);
        return {
            exists: false,
            error: 'Unable to verify email availability'
        };
    }
}

// Middleware for routes
const validateEmailUniqueness = async (req, res, next) => {
    const { email } = req.body;
    
    if (!email) {
        return res.status(400).json({
            success: false,
            error: 'Email is required'
        });
    }

    const emailCheck = await checkEmailUniqueness(email);
    
    if (emailCheck.exists) {
        return res.status(409).json({
            success: false,
            error: 'Email already in use',
            details: emailCheck
        });
    }

    // Add check result to request for use in route handlers
    req.emailCheck = emailCheck;
    next();
};

module.exports = {
    checkEmailUniqueness,
    validateEmailUniqueness
};