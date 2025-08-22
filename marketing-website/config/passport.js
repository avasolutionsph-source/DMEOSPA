import passport from 'passport';
import GoogleStrategy from 'passport-google-oauth20';
import FacebookStrategy from 'passport-facebook';
import User from '../models/User.js';
import logger from '../utils/logger.js';

// Only configure OAuth strategies if credentials are provided
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
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
            user = await User.create({
                googleId: profile.id,
                email: profile.emails[0].value,
                firstName: profile.name.givenName,
                lastName: profile.name.familyName,
                businessName: `${profile.name.givenName}'s Business`,
                avatar: profile.photos[0].value,
                verified: true,
                subscriptionPlan: 'unpaid',
                subscriptionStatus: 'active'
            });
            
            logger.auth('New user registered via Google OAuth', { 
                userId: user._id, 
                email: user.email 
            });
            
            return done(null, user);
        } catch (error) {
            logger.error('Google OAuth error:', error);
            return done(error, null);
        }
    }));
} else {
    logger.info('Google OAuth not configured - missing CLIENT_ID or CLIENT_SECRET');
}

if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
    // Facebook OAuth Strategy
    passport.use(new FacebookStrategy({
        clientID: process.env.FACEBOOK_CLIENT_ID,
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
        callbackURL: "/api/auth/facebook/callback",
        profileFields: ['id', 'emails', 'name', 'photos']
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
                    if (profile.photos && profile.photos[0]) {
                        user.avatar = profile.photos[0].value;
                    }
                    await user.save();
                    return done(null, user);
                }
            }
            
            // Create new user (require email)
            if (!email) {
                return done(new Error('Email is required for registration'), null);
            }
            
            user = await User.create({
                facebookId: profile.id,
                email: email,
                firstName: profile.name.givenName || 'Facebook',
                lastName: profile.name.familyName || 'User',
                businessName: `${profile.name.givenName || 'Facebook'}'s Business`,
                avatar: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
                verified: true,
                subscriptionPlan: 'unpaid',
                subscriptionStatus: 'active'
            });
            
            logger.auth('New user registered via Facebook OAuth', { 
                userId: user._id, 
                email: user.email 
            });
            
            return done(null, user);
        } catch (error) {
            logger.error('Facebook OAuth error:', error);
            return done(error, null);
        }
    }));
} else {
    logger.info('Facebook OAuth not configured - missing CLIENT_ID or CLIENT_SECRET');
}

// Serialize user for session
passport.serializeUser((user, done) => {
    done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id).select('-password');
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

export default passport;