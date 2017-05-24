const express = require('express');
const router = express.Router();
const User = require('../models/user');
const passport = require('passport');
const multer = require('multer');
const makeError = require('http-errors');
const fs = require('fs');
const path = require('path');
const IPFSService = require('../services/ipfs');
const ipfs = new IPFSService();
const CryptoService = require('../services/crypt');
const File = require('../models/file');
const moment = require('moment');
let concat = require('concat-stream');
let through = require('through2');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, __dirname + '/../../uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, req.user.id + "@" + file.originalname)
    }
});
const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        if (!req.isAuthenticated()) {
            return cb(makeError(401));
        }
        cb(null, true);
    }
});


module.exports = function (app, passport) {

    app
        .get('/', function (req, res) {
            res.render('home');
        })
        .get('/register', function (req, res) {
            res.render('register', {})
        })
        .post('/register', passport.authenticate('local-signup', {
            successRedirect: '/profile',
            failureRedirect: '/register',
            failureFlash: true
        }))
        .get('/login', function (req, res) {
            res.render('login', {user: req.user});
        })
        .post('/login', passport.authenticate('local-login'), function (req, res) {
            res.redirect('/');
        })
        .get('/profile', isLoggedIn, function (req, res) {
            const user = req.user;
            user.populate('files', function (err, result) {
                res.render('profile', {
                    user: result
                });
            })

        })
        .get('/user', isLoggedIn, function (req, res) {
            res.json(req.user);
        })
        .get('/user/search', isLoggedIn, function (req, res) {
            const user = req.user,
                fileId = req.params.id,
                query = req.query.q;

            User
                .find({username: {$ne: user.username, $regex: new RegExp(query, 'i')}})
                .exec(function (err, users) {
                    if (err) {
                        console.log(err);
                        return res.json("error");
                    }
                    return res.json(users);
                })
        })
        .get('/logout', function (req, res) {
            req.logout();
            res.redirect('/');
        })
        .post('/user/getAccess/:fileId', [isLoggedIn], function (req, res) {
            const user = req.user,
                userIds = req.body.users,
                fileId = req.params.fileId;

            if (userIds) {
                User
                    .find({_id: {$in: userIds}})
                    .exec(function (err, users) {
                        if (err) {
                            console.log(err);
                        }

                        File
                            .update(
                                {
                                    _id: fileId
                                },
                                {
                                    $addToSet: {hasAccess: {$each: users}}
                                },
                                function (err, results) {
                                    if (err) {
                                        console.log(err);
                                    }
                                    User
                                        .update(users, {
                                            $addToSet: {files: fileId}
                                        }, {multi: true}, function (err, userSaveResult) {
                                            if (err) {
                                                console.log(err);
                                            }
                                            return res.json(userSaveResult);
                                        });
                                }
                            )
                    })
            }
        })
        .post('/file', [isLoggedIn, upload.single('file')], function (req, res, next) {
            if (req.file) {
                const file = req.file,
                    cryptoService = new CryptoService(req.user),
                    dest = file.destination,
                    filename = file.filename,
                    user = req.user;
                if (fs.existsSync(dest + filename)) {
                    fs.readFile(dest + filename, function (err, data) {
                        cryptoService.encrypt(data).then(function (cipherText) {
                            const encrypted = cipherText.data;
                            let bufferedData = new Buffer(encrypted);
                            ipfs.save(bufferedData).then(function (result) {
                                fs.unlink(dest + filename);
                                let userFile = new File({
                                    filename: filename.split('@')[1],
                                    ipfshash: result[0].hash,
                                    owner: user._id,
                                    filesize: result[0].size,
                                    hasAccess: []
                                });
                                userFile.save(function (err) {
                                    if (err) {
                                        console.log(err);
                                    }
                                    user.files.push(userFile);
                                    user.save(function (err) {
                                        if (err) {
                                            console.log(err);
                                        }
                                        return res.json(result);
                                    })
                                });
                            })
                        })
                    })
                }

            }
        })
        .get('/file/access/:id', [isLoggedIn], function (req, res) {
            const user = req.user,
                fileId = req.params.id;

            File
                .findOne({
                    $and: [
                        {_id: fileId},
                        {
                            $or: [
                                {owner: user._id},
                                {hasAccess: {$elemMatch: {_id: user._id}}}
                            ]
                        }
                    ]
                })
                .populate('hasAccess')
                .exec(function (err, file) {
                    if (err) {
                        console.log(err);
                        res.sendStatus(500);
                        return res.json(err);
                    }
                    return res.json(file);
                })
        })
        .get('/file/:id', [isLoggedIn], function (req, res) {
            const user = req.user,
                fileId = req.params.id;
            File
                .findOne({
                    $and: [
                        {_id: fileId},
                        {
                            $or: [
                                {owner: user._id},
                                {hasAccess: {$elemMatch: {_id: user._id}}}
                            ]
                        }
                    ]
                })
                .exec(function (err, file) {
                    if (err) {
                        console.log(err);
                        return res.redirect("/error");
                    }
                    let hash = file.ipfshash;
                    ipfs.get(hash).then(function (stream) {
                        let fileIpfs;
                        let pathFile;
                        stream.pipe(through.obj(function (obj, enc, next) {
                            obj.content.pipe(concat(function (content) {
                                fileIpfs = content;
                                pathFile = obj.path;
                                next();
                            }));
                        }, function () {
                            const cryptoService = new CryptoService(user);
                            let nameFileIpfs = new Date() + pathFile;

                            // fs.writeFile(nameFileIpfs, fileIpfs, 'binary', function (err) {
                            //
                            // });
                            let arrbuf = toArrayBuffer(fileIpfs);
                            cryptoService.decrypt(arrbuf).then(function (decoded) {
                                let bufferedData = new Buffer(decoded.data);
                                return res.send(bufferedData);
                            }, function (errm) {
                                console.log(errm);
                            })
                        }));
                        //
                        // stream.on('data', function (chunk) {
                        //     //streaming file to buf arrays
                        //     bufs.push(chunk.content);
                        // });
                        // stream.on('end', function () {
                        //     let buf = Buffer.concat(bufs);

                        // });
                    });
                });
        })
        .get('/test', function (req, res, next) {
            let filename = path.join(__dirname + '/../../', 'uploads/14943525719375910db2156341390537af781223034845_14799353960339967906.jpg');
            const cryptoService = new CryptoService(req.user);
            if (fs.existsSync(filename)) {
                fs.readFile(filename, function (err, data) {
                    //encode data before save
                    cryptoService.encrypt(data).then(function (cipherText) {
                        let encrypted = cipherText.data;
                        let bufferedData = new Buffer(encrypted);
                        fs.writeFile(__dirname + "/../../test/test.jpg", bufferedData, function (err, d1) {
                            console.log(d1);
                            if (err) {
                                console.log(err);
                            }
                            console.log("ok file saved");
                        })
                    });
                    // if (!err) {
                    //     ipfs.save(data).then(function (result, s) {
                    //         res.json(result)
                    //         res.end();
                    //     })
                    // } else {
                    //     console.log(err);
                    // }
                })
            } else {
                return res.json(makeError(404));
            }
            console.log(1235);
        })
        .get('/decrypt', function (req, res, next) {
            let filename = path.join(__dirname, "/../../test/test.jpg");
            if (fs.existsSync(filename)) {
                fs.readFile(filename, "utf-8", function (err, data) {
                    if (err) {
                        console.log(err);
                    }
                    const cryptoService = new CryptoService(req.user);
                    cryptoService.decrypt(data).then(function (decoded) {
                        let bufferedData = new Buffer(decoded.data);
                        fs.writeFile(__dirname + "/../../test/test_dec.jpg", bufferedData, function (err) {
                            if (err) {
                                console.log(err);
                            }
                            console.log("ok file saved");
                        })
                    })
                });
            }
        })
        .get('/test2', function (req, res) {
            const user = req.user;

        })
        .get('/user', function (req, res) {
            return res.end(req.user);
        })
};

function toArrayBuffer(buf) {
    let ab = new ArrayBuffer(buf.length);
    let view = new Uint8Array(ab);
    for (let i = 0; i < buf.length; ++i) {
        view[i] = buf[i];
    }
    return ab;
}
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect('/');
}