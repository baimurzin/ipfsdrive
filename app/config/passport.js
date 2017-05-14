const LocalStrategy = require('passport-local').Strategy;
const User = require("../models/user");
const crypto = require('crypto');
const CryptoService = require('../services/crypt');

module.exports = function (passport) {
    passport.serializeUser(function (user, done) {
        done(null, user.id);
    });

    // used to deserialize the user
    passport.deserializeUser(function (id, done) {
        User.findById(id, function (err, user) {
            done(err, user);
        });
    });

    passport.use('local-signup', new LocalStrategy({
            usernameField: 'username',
            passwordField: 'password',
            passReqToCallback: true // allows us to pass back the entire request to the callback
        },
        function (req, username, password, done) {
            process.nextTick(function () {

                User.findOne({'username': username}, function (err, user) {
                    if (err) {
                        return done(err);
                    }

                    if (user) {
                        return done(null, false, req.flash('error', 'That username is already taken.'));
                    } else {

                        let newUser = new User();

                        newUser.username = username;
                        newUser.password = newUser.generateHash(password);
                        newUser.passphrase = crypto.randomBytes(32).toString('hex');

                        newUser.save(function (err) {
                            if (err) {
                                throw err;
                            }
                            let pgpService = new CryptoService(newUser);
                            console.time('test');
                            pgpService.generateKeys().then(function (key) {
                                newUser.secretKey = key.privateKeyArmored;
                                newUser.publicKey = key.publicKeyArmored;
                                newUser.save(function (err) {
                                    if (err) {
                                        throw err;
                                    }
                                    console.timeEnd('test');
                                    return done(null, newUser);
                                });

                            });
                        });
                    }

                });

            });

        }));

    passport.use('local-login', new LocalStrategy({
            usernameField: 'username',
            passwordField: 'password',
            passReqToCallback: true
        },
        function (req, username, password, done) {
            User.findOne({'username': username}, function (err, user) {
                // if there are any errors, return the error before anything else
                if (err) {
                    return done(err);
                }

                // if no user is found, return the message
                if (!user) {
                    return done(null, false);
                }

                if (!user.validPassword(password)) {
                    return done(null, false, {
                        error: 'The email you entered is incorrect'
                    });
                }

                // all is well, return successful user
                return done(null, user);
            });

        }));
};