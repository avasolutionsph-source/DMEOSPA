import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

// Basic passport configuration with setupPassport() export function
export function setupPassport() {
  // Serialize user for session
  passport.serializeUser((user, done) => {
    done(null, user._id || user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id, done) => {
    try {
      // Import User model dynamically to avoid circular dependency
      const { default: User } = await import('../models/User.js');
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || "/auth/google/callback"
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Import User model dynamically
        const { default: User } = await import('../models/User.js');
        
        // Check if user already exists with this Google ID
        let user = await User.findOne({ googleId: profile.id });
        
        if (user) {
          return done(null, user);
        }
        
        // Check if user exists with the same email
        user = await User.findOne({ email: profile.emails[0].value });
        
        if (user) {
          // Link Google account to existing user
          user.googleId = profile.id;
          await user.save();
          return done(null, user);
        }
        
        // Create new user
        user = new User({
          googleId: profile.id,
          firstName: profile.name.givenName,
          lastName: profile.name.familyName,
          email: profile.emails[0].value,
          businessName: profile.displayName || `${profile.name.givenName}'s Business`,
          role: 'branch',
          authMethod: 'google'
        });
        
        await user.save();
        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }));
  }

  
  // Return passport instance for middleware use
  return passport;
}

export default passport;