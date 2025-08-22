import passport from 'passport';
import GoogleStrategy from 'passport-google-oauth20';
import FacebookStrategy from 'passport-facebook';
import User from '../models/User.js';
import logger from '../utils/logger.js';

// Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // Check if user already exists with this Google ID
        let user = await User.findOne({ googleId: profile.id });
        
        if (user) {
            return done(null, user);
        }
        
        // Check if user exists with same email
        user = await User.findOne({ email: profile.emails[0].value });
        
        if (user) {
            // Link Google account to existing user
            user.googleId = profile.id;
            user.avatar = profile.photos[0].value;
            await user.save();
            return done(null, user);
        }
        
        // Create new user
        user = new User({
            googleId: profile.id,
            firstName: profile.name.givenName,
            lastName: profile.name.familyName,
            email: profile.emails[0].value,
            avatar: profile.photos[0].value,
            businessName: `${profile.name.givenName}'s Business`,
            subscriptionPlan: 'unpaid',
            emailVerified: true, // Google emails are pre-verified
            authProvider: 'google'
        });
        
        await user.save();
        logger.info(`New user created via Google OAuth: ${user.email}`);
        
        return done(null, user);
    } catch (error) {
        logger.error('Google OAuth error:', error);
        return done(error, null);
    }
}));

// Facebook OAuth Strategy
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "/api/auth/facebook/callback",
    profileFields: ['id', 'emails', 'name', 'picture.width(200).height(200)']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // Check if user already exists with this Facebook ID
        let user = await User.findOne({ facebookId: profile.id });
        
        if (user) {
            return done(null, user);
        }
        
        // Check if user exists with same email
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
        if (email) {
            user = await User.findOne({ email });
            
            if (user) {
                // Link Facebook account to existing user
                user.facebookId = profile.id;
                user.avatar = profile.photos[0].value;
                await user.save();
                return done(null, user);
            }
        }
        
        // Create new user
        user = new User({
            facebookId: profile.id,
            firstName: profile.name.givenName,
            lastName: profile.name.familyName,
            email: email,
            avatar: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
            businessName: `${profile.name.givenName}'s Business`,
            subscriptionPlan: 'unpaid',
            emailVerified: email ? true : false, // Facebook emails are pre-verified if provided
            authProvider: 'facebook'
        });
        
        await user.save();
        logger.info(`New user created via Facebook OAuth: ${user.email || user.facebookId}`);
        
        return done(null, user);
    } catch (error) {
        logger.error('Facebook OAuth error:', error);
        return done(error, null);
    }
}));

// Serialize user for session
passport.serializeUser((user, done) => {
    done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

export default passport;