import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:5000/auth/google",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
            const existingUser = await User.findOne({ email: profile.emails[0].value });
            if (existingUser) {
                user = existingUser;
                user.googleId = profile.id;
                user.picture = profile.photos[0].value;
                if (!user.name) user.name = profile.displayName;
                await user.save();
            } else {
                user = await User.create({
                    googleId: profile.id,
                    name: profile.displayName,
                    email: profile.emails[0].value,
                    picture: profile.photos[0].value,
                    // Use a random password/username for Google users
                    username: profile.displayName.replace(/\s+/g, '').toLowerCase() + Math.random().toString(36).substring(7),
                    password:  Math.random().toString(36).slice(-8)
                });
            }
        }

        done(null, user);
      } catch (err) {
        done(err, null);
      }
    }
  )
);

export default passport;
