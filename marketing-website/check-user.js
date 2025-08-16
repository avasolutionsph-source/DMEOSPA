const mongoose = require('mongoose');
require('dotenv').config();

async function checkUser() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const User = require('./models/User');
        
        // Check kenn@gmail.com subscription
        const user = await User.findOne({ email: 'kenn@gmail.com' });
        if (user) {
            console.log('User found:');
            console.log('Email:', user.email);
            console.log('Subscription Plan:', user.subscriptionPlan);
            console.log('Business Name:', user.businessName);
            console.log('Role:', user.role);
        } else {
            console.log('User kenn@gmail.com not found');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkUser();
